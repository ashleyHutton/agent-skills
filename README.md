# Agent Skills

Reusable skills for AI agent workflows (Claude Code, REINS, etc.).

Each skill is a self-contained directory with a `SKILL.md` that teaches an AI agent how to perform a specific task. Drop them into your `~/.agents/skills/` directory and reference them from your project's `AGENTS.md`.

## Skills

| Skill | Description |
|-------|-------------|
| [agent-browser](skills/agent-browser/) | Headless browser automation via `agent-browser` CLI — DOM inspection, accessibility audits, screenshots, form testing |
| [code-review](skills/code-review/) | Code review using a delegated sub-agent with high reasoning (GPT 5.4 xhigh) |
| [dip](skills/dip/) | Docker Compose development workflows via the `dip` CLI |
| [everhour](skills/everhour/) | Log time to Everhour against GitHub issues |
| [finish-task](skills/finish-task/) | Wrap up a task — update docs, merge, push, close |
| [github-issue](skills/github-issue/) | Full workflow for GitHub issues — read, analyze, plan, implement with red-green-refactor |
| [pull-request](skills/pull-request/) | Open a GitHub PR with changelog, tests, rebase, and reviewer assignment |
| [qa-handoff](skills/qa-handoff/) | Prepare test data and browser links for manual QA verification |
| [sentry](skills/sentry/) | Read Sentry issues, stack traces, and breadcrumbs via the REST API |

## Installation

```bash
# Clone into your skills directory
git clone https://github.com/ashleyHutton/agent-skills.git ~/.agents/skills
```

Or cherry-pick individual skills:

```bash
# Copy just the skills you want
cp -r agent-skills/skills/sentry ~/.agents/skills/
```

## Configuration

Some skills read secrets from files at runtime (never hardcoded):

- **everhour**: API key at `~/.config/everhour/api_key`
- **sentry**: Auth token at `~/.config/sentry/token`

Create these files and `chmod 600` them before using those skills.

## License

MIT
