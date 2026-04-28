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
3. If pre-existing (fails on main too), note it in the PR description but do not block on it.

## 3. Rebase on the latest base branch

Determine which branch you branched off of (usually `main`):

```bash
git fetch origin
git rebase origin/main
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

## 6. Open the PR

```bash
gh pr create \
  --base <base-branch> \
  --title "<concise title>" \
  --body "<description>" \
  [--reviewer "willtcarey"]   # only if user said yes in step 5
```

### Base branch
Always set `--base` to the branch you branched off of (usually `main`).

### Title
Use a clear, concise title. Include the issue number if there is one, e.g.:
`Fix Request Assistance page accessibility issues (#1802)`

### Description
Include:
- A summary of what changed and why
- `Fixes #<issue-number>` (or `Closes #<issue-number>`) to auto-close the GitHub issue when merged — ask the user for the issue number if you don't know it
- Any notes about pre-existing test failures or known limitations
