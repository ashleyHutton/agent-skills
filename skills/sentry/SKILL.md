---
name: sentry
description: Read Sentry issues, events, stack traces, breadcrumbs, tags, and activity via the Sentry REST API. Use whenever the user mentions a Sentry issue, error report, exception, stack trace from production, or pastes a sentry.io URL/short ID like CPPR-INSTITUTE-97.
---

# sentry

Read-only access to Sentry issues via a `curl`+`jq` wrapper around the Sentry REST API. Use this instead of asking the user to paste stack traces — you can fetch them directly.

The wrapper script lives at `~/.agents/skills/sentry/sentry.sh`. Auth token is read from `~/.config/sentry/token` (chmod 600). Override with `SENTRY_AUTH_TOKEN` or `SENTRY_HOST` env vars if needed.

## Known orgs

- `brand-new-box`
- `label-genius`

Run `sentry.sh orgs` to confirm, or `sentry.sh projects <org>` to list projects.

## Identifying issues from URLs / short IDs

When the user shares something like:

- `https://brand-new-box.sentry.io/issues/7394000711/` → org=`brand-new-box`, id=`7394000711`
- `https://brand-new-box.sentry.io/organizations/brand-new-box/issues/7394000711/` → same
- A short ID like `CPPR-INSTITUTE-97` → search for it: `sentry.sh search brand-new-box CPPR-INSTITUTE-97` and pull the numeric `id` from the result

The numeric issue ID is what every other command takes.

## Commands

All commands return trimmed JSON by default (just the fields you usually need). Append `--full` to `issue`, `event`, or `events` for the raw API response.

```bash
# List orgs and projects
sentry.sh orgs
sentry.sh projects brand-new-box

# Issue metadata (title, level, counts, project, assignee)
sentry.sh issue brand-new-box 7394000711

# Latest event — THIS IS THE MAIN ONE.
# Returns: tags, user, contexts (runtime/os/browser/trace), request, full
# exception chain with stack frames (filename, function, lineno, contextLine,
# preContext, postContext, vars), and breadcrumbs.
sentry.sh event brand-new-box 7394000711

# All recent events for an issue (ids + timestamps)
sentry.sh events brand-new-box 7394000711

# Tag distribution (which browsers/users/releases are affected)
sentry.sh tags brand-new-box 7394000711

# Comments, status changes, assignments
sentry.sh activity brand-new-box 7394000711

# Grouping hashes
sentry.sh hashes brand-new-box 7394000711

# Search issues with Sentry's query language
sentry.sh search brand-new-box 'is:unresolved level:error project:cppr-institute'
sentry.sh search brand-new-box 'CPPR-INSTITUTE-97'

# Arbitrary GET against any Sentry API path
sentry.sh raw /api/0/organizations/brand-new-box/projects/
```

## Typical workflow when investigating an issue

1. Resolve to a numeric ID (`search` if you only have a short ID/URL).
2. `sentry.sh issue <org> <id>` to confirm what it is.
3. `sentry.sh event <org> <id>` to get the stack trace, breadcrumbs, request context, and user. This is usually all you need to start debugging.
4. If the trimmed view is missing something, re-run with `--full`.
5. `sentry.sh tags <org> <id>` if you suspect the bug is browser/release/env-specific.
6. `sentry.sh events <org> <id>` if you need to compare multiple occurrences.

## Search query syntax (cheat sheet)

Sentry's query language, useful with `sentry.sh search`:

- `is:unresolved`, `is:resolved`, `is:ignored`
- `level:error`, `level:warning`, `level:info`, `level:fatal`
- `project:<slug>`
- `release:<version>`
- `environment:production`
- `assigned:me` / `assigned:<user>`
- `firstSeen:-24h`, `lastSeen:-7d`
- `user.email:foo@bar.com`
- `<freeform text>` matches title/message
- Combine with spaces (AND): `is:unresolved level:error project:web environment:production`

## Notes

- The token is a Sentry User Auth Token with `org:read`, `project:read`, `event:read` scopes. It is stored at `~/.config/sentry/token`.
- The script depends on `jq` (installed at `~/.local/bin/jq`). Without `jq` it still works but returns raw JSON.
- Pi has no native MCP support, so this skill replaces what `sentry-mcp` would provide. The same Sentry API endpoints back both.
- Read-only by design. No commands here mutate Sentry state (no resolve/assign/comment). Add them if needed.
