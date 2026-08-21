---
name: github-issue
description: Handle a GitHub issue link. Use whenever the user shares a GitHub issue URL — whether they say "look at", "work on", "address", "make a task for", or anything else. Always create a task and follow the full workflow. Reads the issue, analyzes Figma mockups, studies the codebase, and produces a plan file before any implementation.
disable-model-invocation: true
---

# GitHub Issue Workflow

When the user shares a GitHub issue URL, follow this workflow unless they give specific instructions otherwise.

## 0. Create a task

Before doing any work, create a new task for this issue. The task should be worked on in its own session — do NOT do the analysis and planning in the current conversation.

If the user specifies an existing branch to work on, pass that branch as `branch_name` so Reins adopts it. `branch_name` means "the task branch to create or adopt" — it is **not** the base branch to branch from.

If the user specifies a branch or PR to branch **from** (for example, "make this branch off PR #406"), resolve that PR/branch first and create the task branch from that base using the current approved Reins workflow. Do **not** pass the base branch as `branch_name`. If the current Reins tool does not expose a direct `base_branch` parameter, use the project/task workflow that branches from the requested base, or stop and tell the user that task creation needs a base-branch-capable workflow.

Otherwise, let the task system create a new task branch.

Always include `prompt` so Reins creates the task and immediately starts a dedicated task session in the background.

```
create_task(
  title: "<issue title>",
  description: "Analyze and plan implementation for GitHub issue #<number>.",
  branch_name: "<existing task branch to adopt, if explicitly specified>",
  prompt: "<include the full github-issue skill instructions and the issue URL so the task session knows what to do>"
)
```

The prompt passed to the task should instruct the dedicated task session to follow steps 1–6 below.

## 1. Read the issue

```bash
gh issue view <number> --repo <owner>/<repo> --comments
```

Read **every comment** on the issue. Identify:
- What the feature/bug/change is
- Acceptance criteria or requirements
- Any linked Figma mockups or design references

## 2. Analyze Figma mockups

If the issue links to Figma designs, use the Figma MCP to inspect them.

**If the Figma MCP is not available or authentication fails, STOP and tell the user:**

> I need access to the Figma mockup but the Figma MCP isn't authenticated. Can you set that up?

Do not proceed without reviewing linked designs — they are critical context.

If there are no Figma links, skip this step.

## 3. Start the app

Use the `dip` skill to start the application so the user can test during and after implementation. Read the dip skill file first to ensure you're starting services correctly (e.g. `dip up -d`, handling port conflicts, etc.).

## 3.5. Verify bug reports in the browser

If the issue is a **bug report** and the bug is something visible or reproducible in a browser (visual glitch, layout issue, broken form, incorrect content, etc.), use the `agent-browser` skill to attempt to reproduce it before writing the plan.

Read the agent-browser skill file at `/home/ashley/.agents/skills/agent-browser/SKILL.md` for usage details.

- Open the relevant page(s) and try to reproduce the reported behavior.
- Use `agent-browser screenshot` or `agent-browser screenshot --full` to capture evidence.
- Use `agent-browser snapshot` and `agent-browser eval` to inspect the DOM, computed styles, or layout details relevant to the bug.
- If the bug involves responsive/small screen behavior, use `agent-browser eval` to resize the viewport:
  ```bash
  agent-browser eval "window.innerWidth"  # Check current size
  ```

Do not get stuck in a long browser-debugging loop. If agent-browser cannot validate the bug after a reasonable targeted attempt, stop that step and tell the user:
- what you tried
- why validation is blocked or inconclusive
- any evidence gathered so far

Then ask whether to try a different validation approach or proceed to the planning/QA path with the limitation noted.

**Creating test data:** You have permission to create new records needed to reproduce the bug. Prefer creating records through the UI (filling out forms) so they have realistic data and correct associations. If you need to seed records beforehand (e.g., to set up preconditions), that's fine — just make sure they are valid, have proper associations, and look like records a real user would create. **Never delete or remove data from the database without explicit permission from the user.**

**Record your findings in the plan** under a "Bug Verification" section:
- Could you reproduce the bug? What did you observe?
- Is it a real code/CSS issue, or does it appear to be data-related?
- Include any screenshots or DOM details that clarify the root cause.

If the issue is not a bug report, or the bug is not browser-reproducible (e.g., background job failure, API issue), skip this step.

## 4. Analyze the codebase

IMPORTANT: Before writing a plan, read the `codebase-design` skill at `/home/ashley/.agents/skills/codebase-design/SKILL.md` and apply principles throughout the code analysis and plan.

Understand the relevant code:

- Identify which models, controllers, views, and tests are involved
- Read the key files that will need to change
- Check for existing patterns in the codebase that the implementation should follow
- Look at related tests to understand testing conventions
- Identify the affected module's interface and seam, and assess whether the proposed change increases depth, leverage, and locality
- Avoid shallow pass-through modules or hypothetical seams; if a new adapter or abstraction is proposed, explain why it earns its interface

## 4.5. Implementation guidance

Prefer the simplest implementation that satisfies the issue and follows existing Rails/application patterns.

- Do **not** introduce new service objects, classes, concerns, form objects, or other abstraction layers unless the issue clearly warrants them or the existing codebase already uses that pattern for the same kind of behavior.
- Avoid extracting one-line methods that are only called once. Keep straightforward logic inline when that is clearer.
- Prefer placing simple domain behavior in the relevant existing model, controller, view, helper, or object rather than creating a new layer.
- Write user-facing copy for application users, not as a verbatim reflection of the GitHub issue, prompt wording, backend models, database fields, or implementation details. Match nearby product language and keep it helpful and concise.
- Follow local conventions in the surrounding files over introducing a new architecture style.
- When considering a new table, first ask whether the requirement can be met with existing data structures. If a new table is still appropriate, keep it minimal and purposeful.

## 5. Write the plan

Create the `.plans/` directory in the project root if it doesn't exist. These files are globally gitignored, so they won't show up in version control.

Write the plan to `.plans/issue<number>.local.md` with this structure:

```markdown
# Issue #<number>: <title>

## Issue Details
<Summary of the issue and any important context from comments>

## Scope/Clarification
<Bullet points clarifying what's in and out of scope based on the full issue discussion>

## Figma Design Context
<Description of the mockups and key design decisions, or leave out if none are linked>

## Bug Verification
<If this is a bug report: describe what you found when reproducing in the browser. Include what you saw, whether the bug was confirmed, and any root cause clues from the DOM/styles. If not a bug report, leave this out>

## Organizational Patterns
<Relevant patterns found in the codebase that the implementation should follow>

## Simplicity/Architecture Notes
<Apply the codebase-design skill's vocabulary and principles. Explain how the implementation keeps interfaces small, places seams cleanly, and improves depth, leverage, and locality without unnecessary abstraction. Note why any new module, adapter, class/service object, or table is necessary, if one is proposed.>

## Database Changes
<If no schema changes are needed, leave this out. If a new table is proposed, include the proposed shape: table name, columns and types, indexes/constraints, associations, and why existing tables are not sufficient. Keep new tables minimal. Write this in the format of a migration file.>

## Implementation Plan

### Analysis
<What needs to change and why>

### Testing Judgment
<What behavior should be speced and why. Also call out anything intentionally not speced, such as documentation-only changes, constants without behavior, Rails-defined behavior, or implementation details.>

### Tasks
Use red-green-refactor for meaningful behavior changes that should be covered by specs:

- [ ] Task 1 (RED): Write a failing spec for <behavior>. Run `dip rspec spec/path/to/spec.rb` and confirm it fails for the right reason.
- [ ] Task 1 (GREEN): Write the minimum code to make the spec pass.
- [ ] Task 1 (REFACTOR): Clean up. Run `dip rspec` to confirm nothing broke.
- [ ] Task 2 (RED): ...
- [ ] Task 2 (GREEN): ...
- [ ] Task 2 (REFACTOR): ...

For documentation-only work, constants without behavior, Rails-defined behavior, or changes that are not meaningfully specable, do not force low-value specs. Explain the judgment call in "Testing Judgment" and use an appropriate verification task instead.

#### Final: Browser Verification
The last task in every plan should be a browser smoke test using `agent-browser`. This runs after all code changes are complete and all applicable specs pass.

- [ ] Browser verification: Use agent-browser to walk through the affected flow end-to-end.
  - You have permission to create new records needed for verification. Prefer creating them through the UI so they have realistic data and correct associations. If you need to seed precondition records another way, ensure they are valid with proper associations. **Never delete or remove data from the database without explicit permission from the user.**
  - Open the relevant page(s) and confirm they load without Rails errors.
  - If forms were added or changed: submit with valid data, submit with blank/invalid data, and confirm correct validation messages appear (no 500 errors).
  - If the issue was a visual/layout bug: confirm the fix at the relevant screen sizes.
  - If a new feature was added: walk through the full user flow (create, view, edit, delete — whichever apply).
  - Take screenshots as evidence of the working state.
  - If the change introduces visible new behavior, capture 1–3 screenshots that clearly demonstrate it and attach them to a concise GitHub issue comment using `gh issue comment --attach`, following [GitHub CLI's attachment workflow](https://github.com/cli/cli/issues/13256#issuecomment-5330474190). Use descriptive Markdown image references when placement matters, and pass each referenced local file with a matching `--attach` flag:
    ```bash
    gh issue comment <number> --repo <owner>/<repo> --body-file screenshots.md \
      --attach ./new-behavior-1.png \
      --attach ./new-behavior-2.png
    ```
    Skip this only when screenshots are not applicable (for example, a background job, API-only, or documentation change), and state why. If the installed `gh` does not support `--attach`, retain the local screenshots and tell the user that uploading is blocked rather than silently omitting them.
  - If agent-browser cannot validate after a reasonable targeted attempt, stop instead of looping. Tell the user what was attempted, why validation is blocked or inconclusive, and any evidence gathered. Ask whether to try a different validation approach or proceed to QA handoff with the limitation noted.

**Do NOT report the implementation as complete until browser verification passes or the user explicitly approves proceeding despite inconclusive browser validation.**

#### Final: QA Handoff
- [ ] QA handoff: Read the `qa-handoff` skill at `/home/ashley/.agents/skills/qa-handoff/SKILL.md` and follow its steps. Create test records covering the key states/variations, then present the user with browser links and what to verify.

### Files to Modify
<List of files that will be created or changed>

### Notes
<Any risks, open questions, or things to confirm with the user>
```

### Red-Green-Refactor Rules

Use red-green-refactor for meaningful new behavior, behavior changes, and bug fixes that should be protected by specs. Make smart judgment calls about what is worth specifying.

- **Red:** Write a failing spec that describes the desired behavior. Run `dip rspec spec/path/to/spec.rb` and confirm it fails for the right reason.
- **Green:** Write the minimum code to make the spec pass. Run the spec again and confirm it passes.
- **Refactor:** Clean up the implementation. Run the full suite with `dip rspec` to confirm nothing broke.

When changing existing behavior, update the spec first to reflect the new contract (red), then update the code (green).

Do **not** add specs just to satisfy the workflow when they would be low-value or misleading. Examples that usually should not get specs:
- documentation-only changes
- constants without behavior
- Rails-defined behavior that the framework already covers
- private implementation details rather than observable contracts
- trivial wiring where browser/manual verification is the more useful check

If you skip specs for a change, explain why in the plan and include the appropriate alternate verification.

**Testing philosophy:**
- Specs describe contracts (inputs → outputs), not implementation details.
- Use real dependencies where cheap — in-memory databases, factory objects.
- Only mock expensive externals (API calls, external services).

## 6. Present the plan for approval

After writing the plan file, **display the full plan as formatted markdown directly in the conversation** so the user can review it without needing to open the file. Then ask:

> Here's the implementation plan. Want me to proceed, or would you like to adjust anything?

**Do NOT start implementing until the user approves the plan.**
