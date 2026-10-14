---
name: pull-request
description: Open a GitHub pull request. Use only when the user explicitly asks to create, open, or submit a pull request. Do not use for requests to commit or push changes unless the user also explicitly requests a pull request.
disable-model-invocation: true
---

# Opening a Pull Request

## Scope guard

This skill authorizes a pull-request workflow only when the user explicitly asks for a pull request. A request to commit changes, push a branch, or "commit & push current changes" does not authorize opening or preparing a pull request. Handle those Git operations directly without invoking this skill.

Follow every step below in order before opening a PR.

## 1. Ensure a changelog entry exists

Check `CHANGELOG.md` at the project root. If there is no entry for the current changes, add one at the **top** of the file following the existing format:

```
- MM/DD/YYYY - Short description of the change. - @ashleyHutton
```

Use today's date and `@ashleyHutton` as the author.

## 2. Run the full test suite

```bash
dip rspec
```

All specs must pass. If any fail:
1. Investigate whether the failure is related to your changes or pre-existing.
2. If related to your changes, fix them and re-run.
3. If pre-existing (fails on the resolved base branch too), note it in the PR description but do not block on it.

## 3. Rebase on the latest base branch

Determine the PR base branch before rebasing. **Do not assume `main`.** Use this priority order:

1. If the user or task context names a base branch (for example `staging`), use that branch.
2. Otherwise, inspect the repository default branch:

```bash
git fetch origin
git remote show origin | sed -n 's/.*HEAD branch: //p'
# or:
git symbolic-ref --short refs/remotes/origin/HEAD | sed 's#^origin/##'
```

3. If the base branch is still unclear, ask the user before continuing.

Then rebase on the resolved base branch:

```bash
git fetch origin
git rebase origin/<base-branch>
```

If there are merge conflicts, resolve them, then re-run `dip rspec` to confirm nothing broke.

## 4. Push your branch

```bash
git push origin HEAD --force-with-lease
```

Use `--force-with-lease` after a rebase to safely force-push.

## 5. Ask about reviewer

Before opening the PR, ask the user:

> Should I request willtcarey as a reviewer now, or leave it for later?

Wait for their answer. Do **not** request a reviewer without confirmation.

## 6. Capture screenshots for visible changes

If the change adds or modifies user-visible views, use `agent-browser` to capture 1–3 screenshots that clearly demonstrate the new behavior. Choose representative states and viewport sizes rather than documenting every screen.

### Publish screenshots with GitHub CLI attachments

Keep PR screenshots, recordings, and other QA evidence outside the repository in thread storage. A request to include media in a PR means uploading attachments, not adding or committing media files to the repository. Never commit QA media unless the user explicitly asks for those files to be added to the repository.

Use the executor MCP GitHub connection for everything except media uploads. Before using `execute`, read executor's `skills({ name: "execute" })` documentation. Discover tools with `tools.search({ query: "github <intent>" })` or saved connections with `tools.executor.coreTools.connections.list({})`. Inspect the selected schema with `tools.describe.tool({ path })`, then call the full discovered connection path. Check the result for errors and follow pagination when needed. Report connection or capability blockers instead of substituting GitHub CLI. Use read-only tools for investigation; remote writes require authorization for the specific task. Authorization for a complete workflow covers its necessary remote writes; do not ask again for each step.

Executor cannot upload images or videos, so upload screenshots with GitHub CLI. From the thread-storage directory that holds the screenshots, run:

```bash
gh pr edit <number> --repo <owner>/<repo> --body-file <body.md> --attach './<file>.png#<alt text>'
```

Repeat `--attach` for each screenshot. In the body file's `Screenshots` section, reference each image with a relative path that exactly matches its `--attach` path, e.g. `![alt](./shot.png)`, so gh rewrites each reference in place with the uploaded `github.com/user-attachments` URL.

After uploading, read the PR back through executor and confirm the body contains `github.com/user-attachments` URLs and no local paths.

If the gh upload fails, keep the original screenshots in thread storage, list their paths in the PR body, and report the failure. An upload failure is not authorization to add or commit media to the repository.

Skip screenshots when they are not applicable, such as API-only, background-job, or documentation changes.

## 7. Open the PR

Discover and describe the executor GitHub PR-creation tool. Submit the resolved owner/repository, base branch from step 3, current pushed head branch, concise title, and complete Markdown body as structured arguments matching its schema. Verify the returned PR URL. Opening a PR is authorized only by the user's explicit PR request under this skill's scope guard.

If the user approved a reviewer in step 5, discover and describe the review-request tool and request that reviewer after creation. Do not request a reviewer otherwise. Do not merge or make unrelated remote changes.

Executor can't upload media, so attach screenshots after creating the PR with `gh pr edit ... --attach` as described in step 6.

### Base branch
Always set the base to the resolved branch from step 3. Use `main` only when step 3 resolves it to `main`.

### Title
Use a clear, concise title. Include the issue number if there is one, e.g.:
`Fix Request Assistance page accessibility issues (#1802)`

### Description
Include:
- A summary of what changed and why
- `Fixes #<issue-number>` (or `Closes #<issue-number>`) to auto-close the GitHub issue when merged — ask the user for the issue number if you don't know it
- A `Screenshots` section with 1–3 embedded images that have descriptive alt text and a one-line caption each, when the change adds or modifies visible views
- Any notes about pre-existing test failures or known limitations
