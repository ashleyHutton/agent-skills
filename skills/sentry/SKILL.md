---
name: sentry
description: Read Sentry issues, events, stack traces, breadcrumbs, tags, and activity through the Sentry integration in the executor MCP server. Use whenever the user mentions a Sentry issue, error report, exception, stack trace from production, or pastes a sentry.io URL/short ID like CPPR-INSTITUTE-97.
---

# sentry

Sentry is a connected integration (`sentry_io`) in the globally configured `executor` MCP server (`https://executor.brandnewops.com/mcp`). Use executor's `execute` tool, which runs TypeScript with access to `tools.sentry_io.*`. Use this instead of asking the user to paste stack traces — you can fetch them directly.

## Discover tools

Tools live under `tools.sentry_io.org.workspaceSentryMcp.<tool_name>`. Search and describe them before calling one whose arguments you don't know:

```ts
const { items } = await tools.search({ namespace: "sentry_io", query: "issue events", limit: 20 });
const details = await tools.describe.tool({ path: "sentry_io.org.workspaceSentryMcp.get_sentry_resource" });
return { paths: items.map(i => i.path), input: details.inputTypeScript };
```

Call a tool and branch on the result union:

```ts
const result = await tools.sentry_io.org.workspaceSentryMcp.get_sentry_resource({ url: "https://brand-new-box.sentry.io/issues/7394000711/" });
if (!result.ok) return result.error;
return result.data;
```

Call `skills({ name: "execute" })` on the executor server for the full `execute` guide.

## Known orgs

- `brand-new-box`
- `label-genius`

Use `find_organizations` to confirm, or `find_projects` to list projects.

## Common tools

- `get_sentry_resource` — fetch an issue, event, trace, replay, or monitor by URL (preferred) or by `resourceType` + `resourceId`.
- `search_issues` — grouped issues for an org, using natural language or Sentry search syntax.
- `search_errors`, `search_logs`, `search_traces`, `search_replays` — search individual events and telemetry.
- `find_organizations`, `find_projects` — discover slugs.
- `search_sentry_tools` / `execute_sentry_tool` — reach Sentry tools not exposed directly, such as tag distributions or issue activity.
- `analyze_issue_with_seer` — Sentry's AI root-cause analysis. Only run when the user asks.

## Identifying issues from URLs / short IDs

When the user shares something like:

- `https://brand-new-box.sentry.io/issues/7394000711/` → pass the URL straight to `get_sentry_resource`
- `https://brand-new-box.sentry.io/organizations/brand-new-box/issues/7394000711/` → same
- A short ID like `CPPR-INSTITUTE-97` → `get_sentry_resource({ resourceType: "issue", resourceId: "CPPR-INSTITUTE-97", organizationSlug: "brand-new-box" })`, or find it with `search_issues`

## Typical workflow when investigating an issue

1. `get_sentry_resource` with the URL or short ID to get the issue, stack trace, breadcrumbs, request context, and user. This is usually all you need to start debugging.
2. Follow the event's trace ID with `get_sentry_resource({ resourceType: "trace", ... })` if the failure spans services.
3. Use `search_errors` to compare multiple occurrences, or `execute_sentry_tool` for tag distributions if you suspect the bug is browser/release/env-specific.

## Search query syntax (cheat sheet)

Sentry's query language, useful with `search_issues` and `search_errors`:

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

## Permission for actions

Reading needs no extra permission. **Ask the user for explicit confirmation before any call that changes Sentry state**, such as `update_issue` (resolve, ignore, assign) or any write run through `execute_sentry_tool`.

## Authentication and failures

Executor holds the Sentry connection; never try to read or expose its credentials. If the `executor` MCP server reports an authentication failure, tell the user to run `claude mcp login executor --no-browser` (Claude Code) or `codex mcp login executor` (Codex). If the Sentry integration inside executor fails, report the exact error and check `tools.executor.coreTools.connections.list({})`.
