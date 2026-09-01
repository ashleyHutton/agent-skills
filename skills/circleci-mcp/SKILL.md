---
name: circleci-mcp
description: Inspect and troubleshoot CircleCI pipelines through the authenticated CircleCI MCP server. Use whenever the user mentions CircleCI, CI failures, failed builds or jobs, pipeline status, test results, build logs, artifacts, workflow reruns, or deployment information.
---

# CircleCI MCP

Use the globally configured CircleCI hosted MCP server through MCPorter. It is not exposed as a native Reins tool, so invoke it with the `bash` tool using the absolute CLI path:

```bash
/home/ashley/.local/bin/mcporter
```

Do not claim the CircleCI MCP is unavailable merely because it does not appear in the native tool list. Use MCPorter first. Fall back to GitHub commit statuses only if MCPorter or the CircleCI MCP fails, and clearly state that limitation.

## Discover tools

List the current CircleCI tools and their parameters when needed:

```bash
/home/ashley/.local/bin/mcporter list circleci --brief
/home/ashley/.local/bin/mcporter list circleci --json
```

Call a tool and request structured output:

```bash
/home/ashley/.local/bin/mcporter call circleci.<tool_name> <argument>=<value> --output json
```

For complex arguments, follow the schemas returned by `mcporter list circleci --json`. Do not guess tool arguments when they can be discovered.

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

Prefer CircleCI's precise run, workflow, job, test, timing, and log data over GitHub's aggregate commit status.

## Permission for actions

Read-only inspection does not require additional permission. **Ask the user for explicit confirmation immediately before any CircleCI action that changes state**, including:

- `cancel_workflow`
- `rerun_workflow`
- `rollback_deploy_component`
- Any newly added tool that triggers, cancels, retries, deploys, rolls back, or otherwise changes CircleCI state

In the confirmation request, state the exact action and identify the project, workflow/job, environment, and version as applicable. Run only the approved action.

## Authentication and failures

Authentication is stored by MCPorter in its protected credential vault. Never read, print, copy, or expose credential contents.

If a call reports an authentication failure, tell the user reauthorization is needed and run:

```bash
/home/ashley/.local/bin/mcporter auth circleci --no-browser --json
```

The OAuth process must remain alive until its callback completes. On this remote machine, the callback may require an SSH tunnel through `garibaldi.tail0349c.ts.net`.

If MCPorter fails:

1. Capture and report the exact error.
2. Check `/home/ashley/.local/bin/mcporter --version` and `mcporter list circleci --brief`.
3. Do not silently substitute less precise GitHub status data.
4. Ask whether to use the fallback if the MCP cannot be restored promptly.
