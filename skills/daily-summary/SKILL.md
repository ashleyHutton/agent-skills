---
name: daily-summary
description: Summarize a day's work across all REINS projects — tasks completed, time estimates, and session activity. Use when the user asks for a daily summary, work log, standup notes, or what they accomplished.
---

# Daily Summary

Generates a summary of all work done across REINS projects for a given day, including task status, estimated active time per task, and a timeline.

## How to Run

Run the Python script below via bash. Default is today; pass a date argument for a different day.

```bash
python3 ~/.agents/skills/daily-summary/summary.py [YYYY-MM-DD]
```

The script outputs structured markdown. Present it directly to the user.

## What It Reports

1. **Overview** — total tasks worked, completed, and estimated active hours
2. **Task breakdown** — each task with project, status, message count, time window, and estimated active time
3. **Timeline** — chronological view of when work happened on each task
4. **Scratch sessions** — non-task conversations summarized separately

## Time Estimation Method

Active time is estimated from message timestamps:
- Messages within **5 minutes** of each other are considered part of the same "work window"
- Gaps longer than 5 minutes are treated as idle (context switch, thinking, or away)
- The sum of all work windows is the estimated active time for that task/session

This is an approximation — it captures agent-active time, not total human thinking time. It tends to **underestimate** since it doesn't count time the user spends reading output, testing in the browser, etc.

## Notes

- Data comes from the REINS SQLite database at `~/reins/.reins/reins.db`
- Only includes sessions with message activity on the target date
- Tasks that span multiple days only show the activity from the requested day
