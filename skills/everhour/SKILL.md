---
name: everhour
description: Log time to Everhour for GitHub issues. Use when the user asks to track, log, or add time to an issue or task.
---

# Everhour Time Tracking

Log time against GitHub issues via the Everhour API.

## Authentication

The API key is stored at `~/.config/everhour/api_key`. Read it at runtime — **never** hardcode or echo the key in output.

```bash
EVERHOUR_API_KEY=$(cat ~/.config/everhour/api_key | tr -d '[:space:]')
```

Use `$EVERHOUR_API_KEY` in all curl commands below via the `X-Api-Key` header.

**Base URL:** `https://api.everhour.com`

Ashley's Everhour user ID: `983933`

## Task ID Format

Everhour identifies GitHub issues by their **GitHub issue ID** (not the issue number). The task ID format is `gh:<github_issue_id>`.

To get the GitHub issue ID from an issue number:

```bash
gh api repos/<owner>/<repo>/issues/<number> --jq '.id'
```

Then the Everhour task ID is `gh:<that_id>`.

## Common Operations

### Look up a task

```bash
curl -s -H "X-Api-Key: $EVERHOUR_API_KEY" \
  "https://api.everhour.com/tasks/gh:<github_issue_id>"
```

### View time entries for a task

```bash
curl -s -H "X-Api-Key: $EVERHOUR_API_KEY" \
  "https://api.everhour.com/tasks/gh:<github_issue_id>/time"
```

### Add time to a task

Time is in **seconds**. 1 hour = 3600, 30 min = 1800, 15 min = 900.

```bash
curl -s -X POST \
  -H "X-Api-Key: $EVERHOUR_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.everhour.com/tasks/gh:<github_issue_id>/time" \
  -d '{"time": <seconds>, "date": "YYYY-MM-DD"}'
```

This logs time for the authenticated user (Ashley, user ID 983933) on the specified date.

### Update time for a task (set exact total for a date)

```bash
curl -s -X PUT \
  -H "X-Api-Key: $EVERHOUR_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.everhour.com/tasks/gh:<github_issue_id>/time" \
  -d '{"time": <seconds>, "date": "YYYY-MM-DD"}'
```

### Delete time for a task on a date

```bash
curl -s -X DELETE \
  -H "X-Api-Key: $EVERHOUR_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.everhour.com/tasks/gh:<github_issue_id>/time" \
  -d '{"date": "YYYY-MM-DD"}'
```

## Workflow

1. Get the GitHub issue number from context (e.g., issue #591)
2. Look up the GitHub issue ID: `gh api repos/<owner>/<repo>/issues/<number> --jq '.id'`
3. Ask the user how much time to log and for what date (default: today)
4. Read the API key: `EVERHOUR_API_KEY=$(cat ~/.config/everhour/api_key | tr -d '[:space:]')`
5. POST the time entry
6. Confirm what was logged

## Notes

- Minimum time is 60 seconds (1 minute)
- Time is always in seconds
- Date format is `YYYY-MM-DD`
- The API key authenticates as Ashley (user 983933) — time is always logged under her account
