---
name: circleci-mcp
description: Inspect and troubleshoot CircleCI pipelines through the CircleCI integration in the executor MCP server. Use whenever the user mentions CircleCI, CI failures, failed builds or jobs, pipeline status, test results, build logs, artifacts, workflow reruns, or deployment information.
---

# CircleCI via executor

CircleCI is a connected integration (`circleci_mcp`) in the globally configured `executor` MCP server (`https://executor.brandnewops.com/mcp`). Use executor's `execute` tool, which runs TypeScript with access to `tools.circleci_mcp.*`.

Do not claim CircleCI is unavailable merely because no CircleCI-specific tool appears in the native tool list. Use executor's `execute` tool first. Fall back to GitHub commit statuses only if executor or its CircleCI integration fails, and clearly state that limitation.

## Discover tools

Tools live under `tools.circleci_mcp.org.bnb.<tool_name>`. Search and describe them before calling one whose arguments you don't know:

```ts
const { items } = await tools.search({ namespace: "circleci_mcp", query: "job logs", limit: 20 });
const details = await tools.describe.tool({ path: "circleci_mcp.org.bnb.get_job_logs" });
return { paths: items.map(i => i.path), input: details.inputTypeScript };
```

Call a tool and branch on the result union:

```ts
const result = await tools.circleci_mcp.org.bnb.list_runs({ project: "gh/<owner>/<repo>", branch: "<branch>", limit: 5 });
if (!result.ok) return result.error;
return result.data;
```

Call `skills({ name: "execute" })` on the executor server for the full `execute` guide. Do not guess tool arguments when they can be discovered.

## Repository identification

Derive the CircleCI project slug from the repository's `origin` remote. For a GitHub repository, use:

```text
gh/<owner>/<repo>
```

Use the current branch when the user asks about the current work unless they specify another branch, run, workflow, or job.

## Investigation workflow

For a failing or recent build:

1. Identify the project slug and branch.
2. Use `list_runs` to find the relevant run.
3. Use `get_run` and `list_run_workflows` to inspect its workflows.
4. Use `list_workflow_jobs` to locate failed jobs.
5. Use `get_job`, `get_job_logs`, and `list_job_tests` for the actual failure evidence.
6. Use `list_job_artifacts` when artifacts are relevant.
7. Summarize the CircleCI evidence, distinguishing observed logs/results from inferred causes.

Chain these calls inside a single `execute` run when the next step only depends on IDs from the previous one, and return just the fields you need.

Prefer CircleCI's precise run, workflow, job, test, timing, and log data over GitHub's aggregate commit status.

## Permission for actions

Read-only inspection does not require additional permission. **Ask the user for explicit confirmation immediately before any CircleCI action that changes state**, including:

- `cancel_workflow`
- `rerun_workflow`
- `rollback_deploy_component`
- Any newly added tool that triggers, cancels, retries, deploys, rolls back, or otherwise changes CircleCI state

In the confirmation request, state the exact action and identify the project, workflow/job, environment, and version as applicable. Run only the approved action.

## Authentication and failures

Executor holds the CircleCI connection; never try to read or expose its credentials.

If the `executor` MCP server itself reports an authentication failure, tell the user reauthorization is needed: `claude mcp login executor --no-browser` for Claude Code, or `codex mcp login executor` for Codex. If the CircleCI integration inside executor fails authentication, the connection must be fixed in executor at `https://executor.brandnewops.com`.

If executor fails:

1. Capture and report the exact error.
2. Check the connection with `tools.executor.coreTools.connections.list({})`.
3. Do not silently substitute less precise GitHub status data.
4. Ask whether to use the fallback if executor cannot be restored promptly.
