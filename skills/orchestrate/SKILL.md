---
name: orchestrate
description: Orchestrate requested work across visible BB child threads, using as many as needed. Use only when explicitly invoked.
disable-model-invocation: true
---

Orchestrate the requested work with actual BB child threads.

- When running inside BB, create every delegated worker with `bb thread spawn --parent-self`; do not use an internal or provider-only subagent mechanism.
- Keep child threads visible in the BB sidebar unless the user explicitly asks for hidden background work.
- Read the `bb-cli` skill's thread-creation and thread-operation references before spawning or coordinating children.
- Use the current project explicitly. When children must collaborate on the current checkout, pass the current environment explicitly so they share its files.
- Give each child one clear owner scope, constraints, expected deliverable, validation requirements, and a request to report changed files and blockers.
- Separate conflicting file ownership and honor dependencies before starting parallel work.
- Inspect each child's result and workspace changes, run integration verification in the parent, and keep coordinating until the requested outcome is complete or genuinely blocked.
