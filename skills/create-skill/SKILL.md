---
name: create-skill
description: Create a new agent skill. Use when the user asks to create, add, or write a new skill for the agent skills repository.
---

# Create a New Skill

Guide the user through creating a new skill, then publish it to the agent-skills repo.

## Step 1: Gather Information

Ask the user for:

1. **Skill name** — short kebab-case slug (e.g. `deploy`, `linear`, `slack-notify`)
2. **Description** — one sentence for the frontmatter (when should the agent use this skill?)
3. **Disable model invocation?** — Should this skill be restricted from switching models/providers? (`disable-model-invocation: true` in frontmatter). Default is no (omit the field).
4. **What the skill does** — the actual instructions, commands, workflow, etc.

If the user has already provided some or all of this in their message, don't re-ask — just confirm what you understood.

## Step 2: Write the Skill

Create the skill file at:

```
~/agent-skills/skills/<name>/SKILL.md
```

### Template

```markdown
---
name: <name>
description: <one-sentence description>
disable-model-invocation: true   # only include if user said yes
---

# <Title>

<Instructions, commands, workflows, etc.>
```

### Rules

- **NEVER include secrets in the skill file.** No API keys, tokens, passwords, or credentials — not even masked/redacted ones.
- If the skill needs authentication, store credentials in `~/.config/<skill-name>/` and have the skill read them at runtime:
  ```bash
  SECRET=$(cat ~/.config/<skill-name>/<filename> | tr -d '[:space:]')
  ```
- Include a setup section telling the user how to create the config file if auth is needed.
- Keep instructions concrete — use real command examples, not vague descriptions.
- Use `##` sections to organize: Authentication/Setup, Commands/Operations, Workflow, Notes.

## Step 3: Security Review

Before committing, scan the new skill for anything that looks like a secret:

```bash
grep -niE '([a-f0-9]{8}-[a-f0-9]{4}|[a-f0-9]{32,}|sk-[a-zA-Z0-9]+|ghp_[a-zA-Z0-9]+|xox[bpras]-|AKIA[A-Z0-9]+|bearer [a-zA-Z0-9._-]+)' ~/agent-skills/skills/<name>/SKILL.md
```

Also visually confirm no hardcoded credentials, tokens, or keys are present. If anything is found, move it to `~/.config/<skill-name>/` and update the skill to read from file.

## Step 4: Publish

```bash
cd ~/agent-skills
git add skills/<name>/
git commit -m "Add <name> skill"
git push origin main
```

## Step 5: Confirm

Tell the user:
- The skill is live at `~/.agents/skills/<name>/SKILL.md` (via the symlink)
- It's published to GitHub
- Any setup steps they need to do (e.g. creating config files for auth)
