#!/usr/bin/env python3
"""Generate a daily work summary from BB thread activity."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, Iterable, List, Optional, Tuple


IDLE_THRESHOLD = timedelta(minutes=5)
BB_TIMEOUT = 60
MAX_WORKERS = 8


def bb_json(args: List[str]) -> Any:
    """Run a BB CLI command and decode its JSON output."""
    try:
        result = subprocess.run(
            ["bb", *args, "--json"], capture_output=True, text=True, timeout=BB_TIMEOUT
        )
    except FileNotFoundError as exc:
        raise RuntimeError("the bb CLI is not installed or not on PATH") from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"bb {' '.join(args)} timed out") from exc

    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "unknown error"
        raise RuntimeError(f"bb {' '.join(args)} failed: {detail}")
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"bb {' '.join(args)} returned invalid JSON") from exc


def local_datetime(milliseconds: int) -> datetime:
    """Convert BB epoch milliseconds into a timezone-aware local datetime."""
    return datetime.fromtimestamp(milliseconds / 1000).astimezone()


def day_bounds(target: date) -> Tuple[datetime, datetime]:
    # Converting naive local midnights lets the OS apply the UTC offset that
    # was in effect on the requested date, including daylight-saving changes.
    start = datetime.combine(target, time.min).astimezone()
    end = datetime.combine(target + timedelta(days=1), time.min).astimezone()
    return start, end


def estimate_active_time(timestamps: List[datetime]) -> timedelta:
    """Estimate active time by splitting activity at gaps over five minutes."""
    if len(timestamps) < 2:
        return timedelta(minutes=1) if timestamps else timedelta()

    total = timedelta()
    window_start = timestamps[0]
    previous = timestamps[0]
    for timestamp in timestamps[1:]:
        if timestamp - previous > IDLE_THRESHOLD:
            total += previous - window_start + timedelta(seconds=30)
            window_start = timestamp
        previous = timestamp
    return total + previous - window_start + timedelta(seconds=30)


def fmt_duration(duration: timedelta) -> str:
    total_minutes = int(duration.total_seconds() / 60)
    if total_minutes < 1:
        return "<1m"
    hours, minutes = divmod(total_minutes, 60)
    return f"{hours}h {minutes}m" if hours else f"{minutes}m"


def fmt_time(timestamp: datetime) -> str:
    return timestamp.strftime("%H:%M")


def thread_title(thread: Dict[str, Any]) -> str:
    return thread.get("title") or thread.get("titleFallback") or "Untitled thread"


def meaningful_event(event: Dict[str, Any]) -> bool:
    """Select user prompts and completed agent actions, excluding stream noise."""
    event_type = event.get("type")
    if event_type == "client/turn/requested":
        return True
    if event_type != "item/completed":
        return False
    item_type = event.get("data", {}).get("item", {}).get("type")
    return item_type not in {None, "reasoning", "contextCompaction"}


def extract_text(event: Dict[str, Any]) -> str:
    if event.get("type") != "client/turn/requested":
        return ""
    blocks = event.get("data", {}).get("input", [])
    return " ".join(block.get("text", "") for block in blocks if isinstance(block, dict))


def github_repo_url(remote: Optional[str]) -> Optional[str]:
    if not remote:
        return None
    match = re.search(r"github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?$", remote)
    if not match:
        return None
    return f"https://github.com/{match.group(1)}/{match.group(2)}"


def issue_links(title: str, prompt_text: str, repo_url: Optional[str]) -> List[str]:
    """Find issue references in titles and prompts, preferring explicit URLs."""
    links: Dict[str, str] = {}
    combined = f"{title}\n{prompt_text}"
    for owner, repo, number in re.findall(
        r"https://github\.com/([^/\s]+)/([^/\s]+)/issues/(\d+)", combined
    ):
        links[number] = f"https://github.com/{owner}/{repo}/issues/{number}"
    if repo_url:
        # Bare issue numbers in copied workflow text and code examples are noisy.
        # Only trust bare references in the thread title; explicit URLs are safe
        # to collect from prompts as well.
        for number in re.findall(r"(?<![\w/])#(\d+)", title):
            links.setdefault(number, f"{repo_url}/issues/{number}")
    return [f"[#{number}]({url})" for number, url in links.items()]


def list_all_threads() -> List[Dict[str, Any]]:
    """Return current and archived threads without duplicates."""
    threads: Dict[str, Dict[str, Any]] = {}
    for args in (
        ["thread", "list", "--include-hidden"],
        ["thread", "list", "--archived", "--include-hidden"],
    ):
        for thread in bb_json(args):
            threads[thread["id"]] = thread
    return list(threads.values())


def load_thread(thread: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    details = bb_json(["thread", "show", thread["id"]])
    events = bb_json(["thread", "log", thread["id"], "--all"])
    return details, events


def candidate_threads(
    threads: Iterable[Dict[str, Any]], start: datetime, end: datetime
) -> List[Dict[str, Any]]:
    """Use metadata to avoid downloading logs that cannot touch the day."""
    start_ms = int(start.timestamp() * 1000)
    end_ms = int(end.timestamp() * 1000)
    return [
        thread
        for thread in threads
        if thread.get("createdAt", end_ms) < end_ms
        and thread.get("updatedAt", 0) >= start_ms
    ]


def collect_entries(target: date) -> Tuple[List[Dict[str, Any]], List[str]]:
    projects = {project["id"]: project for project in bb_json(["project", "list"])}
    start, end = day_bounds(target)
    threads = candidate_threads(list_all_threads(), start, end)
    loaded: Dict[str, Tuple[Dict[str, Any], List[Dict[str, Any]]]] = {}
    warnings: List[str] = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(load_thread, thread): thread for thread in threads}
        for future in as_completed(futures):
            thread = futures[future]
            try:
                loaded[thread["id"]] = future.result()
            except RuntimeError as exc:
                warnings.append(f"Could not read {thread_title(thread)}: {exc}")

    entries = []
    for thread in threads:
        loaded_thread = loaded.get(thread["id"])
        if not loaded_thread:
            continue
        details, events = loaded_thread
        selected = [
            event
            for event in events
            if meaningful_event(event)
            and start <= local_datetime(event["createdAt"]) < end
        ]
        if not selected:
            continue

        timestamps = sorted(local_datetime(event["createdAt"]) for event in selected)
        project = projects.get(thread.get("projectId"), {})
        project_name = project.get("name") or (
            "personal" if thread.get("projectId") == "proj_personal" else "unknown"
        )
        environment = details.get("environment") or {}
        pull_request = (environment.get("pullRequest") or {}).get("pullRequest")
        if thread.get("visibility") == "hidden":
            # Hidden eval/helper threads can share a parent environment. The PR
            # belongs to the visible delivery thread, not every helper thread.
            pull_request = None
        repo_url = github_repo_url(project.get("gitRemoteUrl"))
        title = thread_title(thread)
        prompts = " ".join(extract_text(event) for event in selected)
        entries.append(
            {
                "id": thread["id"],
                "project": project_name,
                "title": title,
                "status": thread.get("status", "unknown"),
                "parent_id": thread.get("parentThreadId"),
                "event_count": len(selected),
                "first": timestamps[0],
                "last": timestamps[-1],
                "active_time": estimate_active_time(timestamps),
                "issues": issue_links(title, prompts, repo_url),
                "pull_request": pull_request,
            }
        )

    entries.sort(key=lambda entry: entry["first"])
    return entries, warnings


def status_icon(entry: Dict[str, Any]) -> str:
    pull_request = entry.get("pull_request") or {}
    if pull_request.get("state", "").lower() == "merged":
        return "✅"
    if pull_request:
        return "🟣"
    if entry["status"] == "active":
        return "🟡"
    return "🔵"


def reference_text(entry: Dict[str, Any]) -> str:
    references = list(entry["issues"])
    pull_request = entry.get("pull_request")
    if pull_request:
        state = pull_request.get("state", "unknown").upper()
        references.append(
            f"[PR #{pull_request['number']}]({pull_request['url']}) ({state})"
        )
    return " · ".join(references)


def render(target: date, entries: List[Dict[str, Any]], warnings: List[str]) -> str:
    lines = [f"# Daily Summary — {target.isoformat()}", ""]
    if not entries:
        lines.append("No BB activity found for this date.")
        if warnings:
            lines.extend(["", "## Warnings", "", *[f"- {warning}" for warning in warnings]])
        return "\n".join(lines)

    total_active = sum((entry["active_time"] for entry in entries), timedelta())
    merged = sum(
        1
        for entry in entries
        if (entry.get("pull_request") or {}).get("state", "").lower() == "merged"
    )
    project_count = len({entry["project"] for entry in entries})
    lines.extend(
        [
            f"**{len(entries)} BB threads** active across **{project_count} projects** · "
            f"**{merged} merged PRs** · ~**{fmt_duration(total_active)}** estimated active time",
            "",
            "## Threads",
            "",
        ]
    )

    for entry in entries:
        title = entry["title"][:100]
        window = f"{fmt_time(entry['first'])}–{fmt_time(entry['last'])}"
        child = " · **Child thread**" if entry["parent_id"] else ""
        lines.extend(
            [
                f"### {status_icon(entry)} {entry['project']} — {title}",
                "",
                f"- **Active time:** {fmt_duration(entry['active_time'])} · "
                f"**Window:** {window} · **Activity events:** {entry['event_count']}{child}",
            ]
        )
        references = reference_text(entry)
        if references:
            lines.append(f"- **References:** {references}")
        lines.append("")

    lines.extend(["## Timeline", ""])
    for entry in entries:
        references = reference_text(entry)
        suffix = f" — {references}" if references else ""
        lines.append(
            f"- **{fmt_time(entry['first'])}** {status_icon(entry)} "
            f"{entry['project']} / {entry['title'][:65]} "
            f"({fmt_duration(entry['active_time'])}, {entry['event_count']} events){suffix}"
        )

    if warnings:
        lines.extend(["", "## Warnings", ""])
        lines.extend(f"- {warning}" for warning in warnings)

    lines.extend(
        [
            "",
            "---",
            f"*Source: BB thread event logs. Active time estimated from user and agent activity; "
            f"gaps >{int(IDLE_THRESHOLD.total_seconds() / 60)}min are idle. "
            "This excludes reading and offline thinking time.*",
        ]
    )
    return "\n".join(lines)


def parse_target_date(arguments: List[str]) -> date:
    if not arguments:
        return datetime.now().astimezone().date()
    try:
        return date.fromisoformat(arguments[0])
    except ValueError as exc:
        raise RuntimeError("date must use YYYY-MM-DD format") from exc


def main() -> int:
    try:
        target = parse_target_date(sys.argv[1:])
        entries, warnings = collect_entries(target)
        print(render(target, entries, warnings))
        return 0
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
