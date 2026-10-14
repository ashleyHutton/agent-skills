---
name: github-issue
description: Investigate and plan work for a GitHub issue. Use when the user shares a GitHub issue URL and wants to understand, discuss, plan, or implement it.
disable-model-invocation: true
---

# GitHub Issue Workflow

Use this workflow when the user shares a GitHub issue URL, unless they explicitly request a different process.

Keep the work in the current session and checkout. Do not create another task, thread, or worktree unless the user asks.

## 1. Prepare the branch

Determine the repository's base branch before creating an issue branch.

Use the following sources in order:

1. A base branch explicitly specified by the user
2. Repository instructions or an established project convention
3. The remote repository's configured default branch

For example, some projects may use `main`, while others use a project-specific base such as `staging` or `develop`.

Check the working tree before switching branches:

```bash
git status --short --branch
```

Update the base branch using a fast-forward-only pull, then create a new issue branch from it:

```bash
git switch <base-branch>
git pull --ff-only origin <base-branch>
git switch -c issue-<number>-investigation
```

Follow the repository's branch-naming convention when one exists.

Never discard, overwrite, or silently stash existing work. If uncommitted changes, another worktree, an existing issue branch, or repository state makes switching unsafe, stop and ask the user how to proceed.

## 2. Read the issue

Use the executor MCP GitHub connection. Before using `execute`, read executor's `skills({ name: "execute" })` documentation. Discover tools with `tools.search({ query: "github <intent>" })` or saved connections with `tools.executor.coreTools.connections.list({})`. Inspect the selected schema with `tools.describe.tool({ path })`, then call the full discovered connection path. Check the result for errors and follow pagination when needed. Report connection or capability blockers instead of substituting GitHub CLI. Use read-only tools for investigation; remote writes require authorization for the specific task. Authorization for a complete workflow covers its necessary remote writes; do not ask again for each step.

Discover the issue-read and issue-comment tools. Retrieve the issue by owner, repository, and issue number, then read every comment across all pages. Read linked PRs through the same connection when relevant.

Read the complete issue and every comment. Identify:

- The problem or desired change
- Requirements and acceptance criteria
- Clarifications or decisions made in the comments
- Relevant links and supporting context
- Unresolved questions

Distinguish explicit requirements from assumptions or possible interpretations.

Inspect linked designs, documents, pull requests, or other artifacts when they are relevant to understanding the issue. If required context cannot be accessed, explain what is unavailable and how that limits the analysis.

## 3. Analyze the codebase

Before proposing a solution, read the repository's applicable agent instructions and codebase, design, implementation, and testing skills.

Study the relevant parts of the codebase and determine:

- How the behavior works today
- Which files and modules are involved
- Which existing patterns the implementation should follow
- What observable behavior needs to change
- What tests or verification already cover the behavior
- Whether the issue leaves important product or technical questions unanswered

Base recommendations on the repository's actual structure and conventions. Do not impose patterns from unrelated projects.

Prefer the simplest approach that satisfies the issue and fits the existing codebase. When a proposal adds a new abstraction, data structure, or dependency, explain why the existing design is insufficient.

When multiple reasonable approaches exist, explain each one in simple terms. Describe its benefits, drawbacks, risks, and effect on future maintenance.

## 4. Write a discussion plan

Write the plan to `.plans/issue<number>.local.md`. Keep the file local and do not stage or commit it.

The first version is a discussion document, not a final implementation checklist.

Use this structure:

```markdown
# Issue #<number>: <title>

## What the issue is asking

<Explain the requested outcome and important context in simple terms.>

## How it works today

<Explain the current behavior and relevant parts of the codebase.>

## Possible approaches

### Approach: <short name>

<Explain how this approach would work.>

**Benefits**

- <Meaningful benefit>

**Tradeoffs and risks**

- <Meaningful tradeoff or risk>

<Repeat only when there are other approaches genuinely worth discussing.>

## Suggested direction

<State the recommended approach and explain why it best fits the issue and codebase. If there is not enough information to recommend one, explain what must be decided first.>

## Verification considerations

<Explain at a high level what behavior will need automated or manual verification. Follow the repository's own implementation and testing instructions rather than duplicating them here.>

## Questions to resolve

<List decisions or uncertainties that should be discussed before creating the implementation checklist. Omit this section if there are none.>
```

Keep the plan easy to discuss:

- Use simple language.
- Explain necessary technical terms.
- Focus on behavior and meaningful design choices.
- Avoid detailed pseudocode unless it clarifies an important decision.
- Do not turn tentative ideas into fixed tasks.
- Do not invent alternative approaches merely to fill out the document.

## 5. Present the plan

Display the complete discussion plan as formatted Markdown in the conversation so the user can review it without opening the file.

Invite the user to discuss:

- Whether the issue has been understood correctly
- Which approach they prefer
- Whether the suggested direction fits the product and codebase
- Any unresolved questions or scope decisions

Do not begin implementation while the approach is still being discussed.
