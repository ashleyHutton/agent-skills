---
name: finish-task
description: Wrap up a completed task — update outdated docs, commit and push to main, and close the task. Run manually after a feature is done.
disable-model-invocation: true
---

# Finish Task

Wrap up the current task: update docs, merge to main, push, and close.

## Steps

### 1. Review docs for staleness

Read the project's doc files (check AGENT.md for doc locations — typically `docs/dev/`, `docs/features/`, `docs/plans/`, `docs/TODO.md`). Update any docs that are now out of date given the work done on this branch:

- Update TODO.md — check off completed items, move them to "Done" section
- Update architecture docs if the architecture changed
- Update or create feature docs for new features
- Move completed plan docs to `docs/plans/completed/` if the plan is fully implemented
- Update any other stale docs

### 2. Commit all remaining changes

Stage and commit any uncommitted work (including the doc updates from step 1). Use a clear commit message describing what was updated.

### 3. Merge branch into main and push

```bash
git checkout main
git merge <task-branch> --no-ff -m "Merge branch '<task-branch>'"
git push origin main
```

If there are merge conflicts, resolve them and continue.

### 4. Close the task

Use the `execute` tool to close the current task:

```javascript
const task = await api.tasks.current();
if (task) {
  await api.tasks.close(task.id);
}
```

### 5. Confirm

Report what was done:
- Which docs were updated
- The merge commit
- That the task is closed
