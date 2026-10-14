---
name: daily-summary
description: Summarize a day's work across BB projects and personal threads, including active threads, time estimates, linked GitHub issues, and pull requests. Use when the user asks for a daily summary, work log, standup notes, or what they accomplished.
---

# Daily Summary

Generate a summary of work recorded in BB for a given day. Include standard
projects, personal threads, child threads, and archived threads with activity.

## Run

Run the bundled script with bash. It defaults to today in the machine's local
timezone; pass an ISO date for another day.

```bash
daily-summary [YYYY-MM-DD]
```

The executable is symlinked at `~/.local/bin/daily-summary`. Its source is the
`summary.py` file next to this `SKILL.md`.

Present the script's structured Markdown directly to the user. If it reports a
warning for a thread, retain that warning so the user knows the summary may be
incomplete.

## Data and Output

The script uses the authenticated `bb` CLI as its only activity source:

- `bb project list` identifies project names and GitHub repositories.
- Current and archived `bb thread list` results identify candidate threads.
- `bb thread log --all` supplies timestamps for user prompts and completed
  agent actions.
- `bb thread show` supplies pull-request state from the thread environment.

The report contains an overview, per-thread breakdown, chronological timeline,
GitHub issue links found in thread titles/prompts, and associated pull requests.
Personal BB conversations appear under the `personal` project. Merged pull
requests count as completed delivery; BB thread status itself is shown only as
current activity state because idle does not mean completed.

## Time Estimate

Activity events within five minutes of one another form a work window. Longer
gaps are idle. The sum of the windows is estimated active time. This measures
BB-recorded user and agent activity and excludes time spent reading, manually
testing, thinking offline, or working outside BB.

## Failure Handling

- If `bb` is missing, unauthenticated, or unavailable, report the script error.
- If one thread cannot be read, include the remaining activity and preserve the
  warning printed by the script.
- Do not fall back to the REINS SQLite database; BB is the source of truth.
