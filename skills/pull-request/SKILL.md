---
name: pull-request
description: Open a GitHub pull request. Use this skill whenever asked to create a PR, submit a PR, or push changes for review.
disable-model-invocation: true
---

# Opening a Pull Request

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

### Use the released GitHub CLI attachment support

File attachments are officially available in GitHub CLI **v2.99.0 and newer**, as announced in [`cli/cli#13256`](https://github.com/cli/cli/issues/13256#issuecomment-5500144244). Before opening a visible-change PR, verify that the active stable binary supports `--attach`:

```bash
which gh
gh version
gh pr create --help | grep -- --attach
```

This machine keeps the current stable release at `/home/ashley/.pi/agent/bin/gh`, which is first on `PATH`, and `/home/ashley/.local/bin/gh`. If `gh` is older than v2.99.0 or lacks `--attach`, update it from the official [GitHub CLI releases](https://github.com/cli/cli/releases/latest), then re-run the checks. Do not seek preview artifacts or build an unreleased branch.

Only report uploading as blocked if updating/running the released CLI or authenticating the upload actually fails.

Add descriptive Markdown image references to the PR body, then attach each referenced local file with `gh pr create --attach`, following the [released GitHub CLI attachment workflow](https://github.com/cli/cli/issues/13256#issuecomment-5500144244). Pass each referenced local file with a matching `--attach` flag. You may also provide image alt text after `#`, such as `--attach './order-lookup-results.png#Order lookup results'`:

```markdown
## Screenshots

![New order lookup results](./order-lookup-results.png)
```

Skip screenshots only when they are not applicable, such as API-only, background-job, or documentation changes. If a PR was already opened before screenshots were attached, update it with the released CLI rather than leaving the images local:

```bash
gh pr edit <number> --body-file pr-body.md \
  --attach ./screenshot-1.png \
  --attach ./screenshot-2.png
```

## 7. Open the PR

```bash
gh pr create \
  --base <base-branch> \
  --title "<concise title>" \
  --body-file pr-body.md \
  [--attach ./screenshot-1.png --attach ./screenshot-2.png] \
  [--reviewer "willtcarey"]   # only if user said yes in step 5
```

### Base branch
Always set `--base` to the resolved base branch from step 3. Do not use `main` unless step 3 specifically resolved the base branch to `main`.

### Title
Use a clear, concise title. Include the issue number if there is one, e.g.:
`Fix Request Assistance page accessibility issues (#1802)`

### Description
Include:
- A summary of what changed and why
- `Fixes #<issue-number>` (or `Closes #<issue-number>`) to auto-close the GitHub issue when merged — ask the user for the issue number if you don't know it
- A `Screenshots` section with 1–3 attached images when the change adds or modifies visible views
- Any notes about pre-existing test failures or known limitations
