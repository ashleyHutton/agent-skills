#!/usr/bin/env python3
"""Daily work summary from the REINS database."""

from __future__ import annotations

import sqlite3
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

DB_PATH = Path.home() / "reins" / ".reins" / "reins.db"
IDLE_THRESHOLD = timedelta(minutes=5)


def parse_ts(ts: str) -> datetime:
    """Parse an ISO timestamp from the DB."""
    ts = ts.replace("Z", "+00:00")
    # Handle both with and without fractional seconds
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            return datetime.strptime(ts, fmt)
        except ValueError:
            continue
    # Fallback: strip timezone and parse
    return datetime.fromisoformat(ts.replace("Z", "").split("+")[0])


def estimate_active_time(timestamps: list[datetime]) -> timedelta:
    """Estimate active work time from a sorted list of message timestamps.
    
    Groups messages into work windows: consecutive messages within
    IDLE_THRESHOLD of each other are one window. Gaps beyond that
    are treated as idle.
    """
    if len(timestamps) < 2:
        return timedelta(minutes=1) if timestamps else timedelta()

    total = timedelta()
    window_start = timestamps[0]
    prev = timestamps[0]

    for ts in timestamps[1:]:
        gap = ts - prev
        if gap > IDLE_THRESHOLD:
            # Close the current window
            total += prev - window_start + timedelta(seconds=30)  # pad last msg
            window_start = ts
        prev = ts

    # Close final window
    total += prev - window_start + timedelta(seconds=30)
    return total


def fmt_duration(td: timedelta) -> str:
    """Format a timedelta as Xh Ym."""
    total_minutes = int(td.total_seconds() / 60)
    if total_minutes < 1:
        return "<1m"
    hours, minutes = divmod(total_minutes, 60)
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def fmt_time(ts: datetime) -> str:
    """Format a timestamp as HH:MM."""
    return ts.strftime("%H:%M")


def main():
    target_date = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime("%Y-%m-%d")

    if not DB_PATH.exists():
        print(f"Error: REINS database not found at {DB_PATH}")
        sys.exit(1)

    db = sqlite3.connect(str(DB_PATH))
    db.row_factory = sqlite3.Row

    # Get all messages for the target date, grouped by task/session
    rows = db.execute("""
        SELECT
            sm.created_at,
            sm.role,
            s.id as session_id,
            s.task_id,
            t.title as task_title,
            t.status as task_status,
            t.branch_name,
            p.name as project
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

    # Group messages by task (or session for scratch)
    groups = defaultdict(lambda: {
        "project": "",
        "title": "",
        "status": "",
        "branch": "",
        "is_scratch": False,
        "timestamps": [],
        "msg_count": 0,
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
        g["title"] = title
        g["status"] = status
        g["branch"] = branch
        g["is_scratch"] = is_scratch
        g["timestamps"].append(parse_ts(r["created_at"]))
        g["msg_count"] += 1

    # Calculate active time for each group
    tasks = []
    scratches = []
    total_active = timedelta()

    for key, g in groups.items():
        ts = sorted(g["timestamps"])
        active = estimate_active_time(ts)
        total_active += active

        entry = {
            "project": g["project"],
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

    # Sort tasks by first message time
    tasks.sort(key=lambda t: t["first"])
    scratches.sort(key=lambda t: t["first"])

    completed = [t for t in tasks if t["status"] == "closed"]

    # --- Output ---

    print(f"# Daily Summary — {target_date}\n")

    print(f"**{len(tasks)} tasks** worked on across "
          f"**{len(set(t['project'] for t in tasks))} projects** · "
          f"**{len(completed)} completed** · "
          f"~**{fmt_duration(total_active)}** estimated active time\n")

    # Task breakdown
    print("## Tasks\n")
    print("| Status | Project | Task | Active Time | Window |")
    print("|--------|---------|------|-------------|--------|")
    for t in tasks:
        icon = "✅" if t["status"] == "closed" else "🔵"
        window = f"{fmt_time(t['first'])}–{fmt_time(t['last'])}"
        title = t["title"][:60]
        print(f"| {icon} | {t['project']} | {title} | {fmt_duration(t['active_time'])} | {window} |")

    # Timeline
    print("\n## Timeline\n")
    all_entries = [(e["first"], e) for e in tasks + scratches]
    all_entries.sort(key=lambda x: x[0])

    for _, e in all_entries:
        icon = "✅" if e["status"] == "closed" else ("💬" if not e["status"] else "🔵")
        label = e["title"][:55]
        print(f"- **{fmt_time(e['first'])}** — {icon} {e['project']} / {label} "
              f"({fmt_duration(e['active_time'])} active, {e['msg_count']} msgs)")

    # Scratch sessions
    if scratches:
        print("\n## Scratch Sessions\n")
        for s in scratches:
            window = f"{fmt_time(s['first'])}–{fmt_time(s['last'])}"
            print(f"- **{s['project']}** — {s['msg_count']} msgs, "
                  f"{fmt_duration(s['active_time'])} active ({window})")

    print(f"\n---\n*Active time estimated from message timestamps. "
          f"Gaps >{int(IDLE_THRESHOLD.total_seconds() / 60)}min treated as idle. "
          f"Underestimates total effort (excludes reading, testing, thinking).*")


if __name__ == "__main__":
    main()
