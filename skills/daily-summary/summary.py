#!/usr/bin/env python3
"""Daily work summary from the REINS database."""

from __future__ import annotations

import json
import re
import sqlite3
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

DB_PATH = Path.home() / "reins" / ".reins" / "reins.db"
IDLE_THRESHOLD = timedelta(minutes=5)
GH_TIMEOUT = 10


def parse_ts(ts: str) -> datetime:
    """Parse an ISO timestamp from the DB."""
    ts = ts.replace("Z", "+00:00")
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            return datetime.strptime(ts, fmt)
        except ValueError:
            continue
    return datetime.fromisoformat(ts.replace("Z", "").split("+")[0])


def estimate_active_time(timestamps: List[datetime]) -> timedelta:
    """Estimate active work time from sorted message timestamps.

    Messages within IDLE_THRESHOLD of each other form a work window.
    Gaps beyond that are treated as idle.
    """
    if len(timestamps) < 2:
        return timedelta(minutes=1) if timestamps else timedelta()

    total = timedelta()
    window_start = timestamps[0]
    prev = timestamps[0]

    for ts in timestamps[1:]:
        if ts - prev > IDLE_THRESHOLD:
            total += prev - window_start + timedelta(seconds=30)
            window_start = ts
        prev = ts

    total += prev - window_start + timedelta(seconds=30)
    return total


def fmt_duration(td: timedelta) -> str:
    total_minutes = int(td.total_seconds() / 60)
    if total_minutes < 1:
        return "<1m"
    hours, minutes = divmod(total_minutes, 60)
    return f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"


def fmt_time(ts: datetime) -> str:
    return ts.strftime("%H:%M")


def gh_run(args: List[str], cwd: str) -> Optional[str]:
    """Run a gh CLI command, return stdout or None on failure."""
    try:
        result = subprocess.run(
            ["gh"] + args,
            capture_output=True, text=True, cwd=cwd, timeout=GH_TIMEOUT,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


def get_repo_url(project_path: str) -> Optional[str]:
    """Get the GitHub repo URL for a project."""
    out = gh_run(["repo", "view", "--json", "url"], cwd=project_path)
    if out:
        try:
            return json.loads(out).get("url")
        except (json.JSONDecodeError, KeyError):
            pass
    return None


def get_pr_info(branch: str, project_path: str) -> Optional[Dict]:
    """Look up a PR by head branch. Returns {number, url, state} or None."""
    out = gh_run(
        ["pr", "list", "--head", branch, "--state", "all",
         "--json", "number,url,state,body"],
        cwd=project_path,
    )
    if not out or out == "[]":
        return None
    try:
        prs = json.loads(out)
        if prs:
            pr = prs[0]
            # Extract linked issues from PR body
            body = pr.get("body") or ""
            linked = re.findall(
                r"(?:Fixes|Closes|Resolves)\s+#(\d+)", body, re.IGNORECASE
            )
            return {
                "number": pr["number"],
                "url": pr["url"],
                "state": pr["state"],
                "linked_issues": linked,
            }
    except (json.JSONDecodeError, KeyError, IndexError):
        pass
    return None


def extract_issue_numbers(title: str) -> List[str]:
    """Pull issue numbers like #123 from a task title."""
    return re.findall(r"#(\d+)", title)


def main():
    target_date = (
        sys.argv[1] if len(sys.argv) > 1
        else datetime.now().strftime("%Y-%m-%d")
    )

    if not DB_PATH.exists():
        print(f"Error: REINS database not found at {DB_PATH}")
        sys.exit(1)

    db = sqlite3.connect(str(DB_PATH))
    db.row_factory = sqlite3.Row

    # ── Collect messages ──────────────────────────────────────────────
    rows = db.execute("""
        SELECT
            sm.created_at, sm.role,
            s.id as session_id, s.task_id,
            t.title as task_title, t.status as task_status, t.branch_name,
            p.name as project, p.path as project_path
        FROM session_messages sm
        JOIN sessions s ON sm.session_id = s.id
        LEFT JOIN tasks t ON s.task_id = t.id
        JOIN projects p ON s.project_id = p.id
        WHERE date(sm.created_at) = ?
        ORDER BY sm.created_at
    """, (target_date,)).fetchall()

    if not rows:
        print(f"# Daily Summary — {target_date}\n")
        print("No activity found for this date.")
        return

    # ── Group by task / scratch session ───────────────────────────────
    groups = defaultdict(lambda: {
        "project": "", "project_path": "", "title": "", "status": "",
        "branch": "", "is_scratch": False, "timestamps": [], "msg_count": 0,
    })

    for r in rows:
        if r["task_id"]:
            key = f"task-{r['task_id']}"
            title = r["task_title"]
            is_scratch = False
            status = r["task_status"]
            branch = r["branch_name"] or ""
        else:
            key = f"scratch-{r['session_id']}"
            title = "(scratch session)"
            is_scratch = True
            status = ""
            branch = ""

        g = groups[key]
        g["project"] = r["project"]
        g["project_path"] = r["project_path"]
        g["title"] = title
        g["status"] = status
        g["branch"] = branch
        g["is_scratch"] = is_scratch
        g["timestamps"].append(parse_ts(r["created_at"]))
        g["msg_count"] += 1

    # ── Build entries with timing ─────────────────────────────────────
    tasks = []
    scratches = []
    total_active = timedelta()

    for key, g in groups.items():
        ts = sorted(g["timestamps"])
        active = estimate_active_time(ts)
        total_active += active

        entry = {
            "project": g["project"],
            "project_path": g["project_path"],
            "title": g["title"],
            "status": g["status"],
            "branch": g["branch"],
            "msg_count": g["msg_count"],
            "first": ts[0],
            "last": ts[-1],
            "active_time": active,
        }

        if g["is_scratch"]:
            scratches.append(entry)
        else:
            tasks.append(entry)

    tasks.sort(key=lambda t: t["first"])
    scratches.sort(key=lambda t: t["first"])
    completed = [t for t in tasks if t["status"] == "closed"]

    # ── Look up GitHub issues & PRs ───────────────────────────────────
    # Cache repo URLs per project path
    repo_urls = {}  # type: Dict[str, Optional[str]]

    for t in tasks:
        pp = t["project_path"]
        if pp not in repo_urls:
            repo_urls[pp] = get_repo_url(pp)

        repo_url = repo_urls[pp]

        # Issues referenced in title
        title_issues = extract_issue_numbers(t["title"])

        # PR lookup
        pr = get_pr_info(t["branch"], pp) if t["branch"] else None

        # Merge all issue numbers (from title + PR body), deduplicated, ordered
        all_issues = list(dict.fromkeys(title_issues + (pr["linked_issues"] if pr else [])))

        # Build issue URLs
        issue_links = []
        if repo_url and all_issues:
            for num in all_issues:
                issue_links.append(f"[#{num}]({repo_url}/issues/{num})")
        elif all_issues:
            issue_links = [f"#{num}" for num in all_issues]

        t["pr"] = pr
        t["issue_links"] = issue_links
        t["issue_numbers"] = all_issues

    # ── Output ────────────────────────────────────────────────────────
    print(f"# Daily Summary — {target_date}\n")

    print(
        f"**{len(tasks)} tasks** worked on across "
        f"**{len(set(t['project'] for t in tasks))} projects** · "
        f"**{len(completed)} completed** · "
        f"~**{fmt_duration(total_active)}** estimated active time\n"
    )

    # ── Task breakdown ────────────────────────────────────────────────
    print("## Tasks\n")

    for t in tasks:
        icon = "✅" if t["status"] == "closed" else "🔵"
        window = f"{fmt_time(t['first'])}–{fmt_time(t['last'])}"
        title = t["title"][:80]

        pr = t["pr"]
        pr_str = ""
        if pr:
            state_label = pr["state"].upper()
            pr_str = f"[PR #{pr['number']}]({pr['url']}) ({state_label})"

        issues_str = ", ".join(t["issue_links"]) if t["issue_links"] else ""

        print(f"### {icon} {t['project']} — {title}\n")
        print(f"- **Active time:** {fmt_duration(t['active_time'])} · **Window:** {window} · **Messages:** {t['msg_count']}")
        if issues_str or pr_str:
            refs = " · ".join(filter(None, [issues_str, pr_str]))
            print(f"- **References:** {refs}")
        print()

    # ── Timeline ──────────────────────────────────────────────────────
    print("## Timeline\n")
    all_entries = [(e["first"], e) for e in tasks + scratches]
    all_entries.sort(key=lambda x: x[0])

    for _, e in all_entries:
        icon = "✅" if e["status"] == "closed" else ("💬" if not e["status"] else "🔵")
        label = e["title"][:55]
        pr = e.get("pr")
        issues = e.get("issue_links", [])
        refs = ""
        if issues or pr:
            parts = []
            if issues:
                parts.append(", ".join(issues))
            if pr:
                parts.append(f"[PR #{pr['number']}]({pr['url']})")
            refs = f" — {' · '.join(parts)}"
        print(
            f"- **{fmt_time(e['first'])}** {icon} {e['project']} / {label} "
            f"({fmt_duration(e['active_time'])}, {e['msg_count']} msgs){refs}"
        )

    # ── Scratch sessions ──────────────────────────────────────────────
    if scratches:
        print("\n## Scratch Sessions\n")
        for s in scratches:
            window = f"{fmt_time(s['first'])}–{fmt_time(s['last'])}"
            print(
                f"- **{s['project']}** — {s['msg_count']} msgs, "
                f"{fmt_duration(s['active_time'])} active ({window})"
            )

    # ── Footer ────────────────────────────────────────────────────────
    print(
        f"\n---\n*Active time estimated from message timestamps. "
        f"Gaps >{int(IDLE_THRESHOLD.total_seconds() / 60)}min treated as idle. "
        f"Underestimates total effort (excludes reading, testing, thinking).*"
    )


if __name__ == "__main__":
    main()
