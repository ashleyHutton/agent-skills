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

Use the executor MCP GitHub connection. Before using `execute`, read executor's `skills({ name: "execute" })` documentation. Discover tools with `tools.search({ query: "github <intent>" })` or saved connections with `tools.executor.coreTools.connections.list({})`. Inspect the selected schema with `tools.describe.tool({ path })`, then call the full discovered connection path. Check the result for errors and follow pagination when needed. Report connection or capability blockers instead of substituting GitHub CLI. Use read-only tools for investigation; remote writes require authorization for the specific task. Authorization for a complete workflow covers its necessary remote writes; do not ask again for each step.

Discover the issue-read tool and retrieve the issue by owner, repository, and issue number. Use its numeric GitHub issue `id`, not the issue number or GraphQL node ID.

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
2. Look up the numeric GitHub issue ID through the executor GitHub issue-read tool as described above.
3. Use the date specified by the user. If no date is specified, assume today in Central Time (`TZ=America/Chicago date +%F`) without asking for confirmation.
4. Read the API key: `EVERHOUR_API_KEY=$(cat ~/.config/everhour/api_key | tr -d '[:space:]')`
5. POST the time entry
6. Confirm what was logged

## Notes

- Minimum time is 60 seconds (1 minute)
- Time is always in seconds
- Date format is `YYYY-MM-DD`
- When the user does not specify a date, use the current date in Central Time without confirming it first
- The API key authenticates as Ashley (user 983933) — time is always logged under her account
