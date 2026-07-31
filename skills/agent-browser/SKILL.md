---
name: agent-browser
description: Inspect, interact with, and test web pages using agent-browser, a fast headless browser CLI for AI agents. Use instead of Puppeteer, Playwright, or curl for any task requiring a real browser (JavaScript-rendered DOM, accessibility audits, form testing, screenshots).
---

# agent-browser

`agent-browser` is a CLI tool for headless browser automation. **Always use this instead of Puppeteer, Playwright, or other browser libraries** when you need to inspect or interact with web pages.

## Quick Reference

### Runtime check

Current `agent-browser` releases declare Node 24+ support, though the packaged native binary can run through older Node wrappers. Before a browser-heavy task, or if the CLI fails immediately, verify:

```bash
node --version
agent-browser --version
agent-browser doctor --json
agent-browser --help
```

Use `agent-browser` 0.32.0 or newer. Earlier releases can falsely time out after a page has completed loading and leave stale daemons or discarded tabs in a hung state. Upgrade before browser work when an older version is installed.

Also check the Chrome version reported by `doctor`. `agent-browser` prefers an installed system Chrome even when a newer Chrome for Testing exists in the Puppeteer cache, and an obsolete system browser can cause clicks and Turbo/SPA navigations to hang while the server completes normally. Confirm by starting a fresh session with `AGENT_BROWSER_EXECUTABLE_PATH` set to the current Chrome for Testing binary. If that resolves the problem, persist its path as `executablePath` in `~/.agent-browser/config.json`; do not work around it by bypassing client-side navigation.

If `agent-browser` reports a syntax error such as `Unexpected token '?'`, the shell is finding an old Node. Fix `node` on `PATH` or run the CLI through a modern runtime before continuing; do not keep retrying the broken command.

### Open a page
```bash
agent-browser open <url>
```

### Accessibility snapshot (primary inspection tool)
```bash
agent-browser snapshot                   # Full page accessibility tree with refs
agent-browser snapshot -i                # Interactive elements only
agent-browser snapshot -s "<css>"        # Scope to CSS selector
agent-browser snapshot -c                # Compact (remove empty structural nodes)
agent-browser snapshot -d 3              # Limit tree depth
```
The snapshot shows the accessibility tree as a screen reader sees it. Each interactive element gets a `[ref=eN]` you can use in subsequent commands.

### Run JavaScript in the page
```bash
agent-browser eval "<js expression>"
```
Use this for DOM queries the snapshot doesn't cover, e.g.:
```bash
# Find all aria-hidden elements
agent-browser eval "JSON.stringify(document.querySelectorAll('[aria-hidden=true]').length)"

# Get computed styles
agent-browser eval "JSON.stringify(getComputedStyle(document.querySelector('.my-el')).display)"

# Inspect specific attributes
agent-browser eval "document.querySelector('#my-id').getAttribute('aria-label')"
```

### Interact with elements (use @ref from snapshot)
```bash
agent-browser click @e2
agent-browser fill @e3 "text to type"
agent-browser type @e1 "appends text"
agent-browser select @e5 "option value"
agent-browser press Enter
agent-browser hover @e4
agent-browser check @e6
agent-browser uncheck @e6
```

### Get info from elements
```bash
agent-browser get text @e1           # Text content
agent-browser get html @e1           # innerHTML
agent-browser get value @e1          # Input value
agent-browser get attr name @e1      # Specific attribute
agent-browser get title              # Page title
agent-browser get url                # Current URL
agent-browser get count ".items"     # Count matching elements
```

### Check element state
```bash
agent-browser is visible @e1
agent-browser is enabled @e1
agent-browser is checked @e1
```

### Screenshots
```bash
agent-browser screenshot              # Viewport screenshot
agent-browser screenshot --full       # Full page
agent-browser screenshot path.png     # Save to file
```

### Navigation
```bash
agent-browser back
agent-browser forward
agent-browser reload
agent-browser scroll down 500
agent-browser scrollintoview @e10
agent-browser wait 2000               # Wait ms
agent-browser wait ".selector"        # Wait for element
```

### Sessions (isolated browser contexts)
```bash
agent-browser --session mytest open http://localhost:3000
agent-browser --session mytest snapshot
agent-browser session list
agent-browser close                    # Close current session
```

## Common Patterns

### Accessibility audit
```bash
agent-browser open http://localhost:3000/page
agent-browser snapshot                                    # Check a11y tree
agent-browser eval "JSON.stringify(                       # Find aria-hidden elements
  Array.from(document.querySelectorAll('[aria-hidden=true]'))
    .map(el => ({tag: el.tagName, id: el.id, classes: el.className?.toString()?.substring(0,100)}))
)"
```

### Inspect form fields after JS runs
```bash
agent-browser open http://localhost:3000/form-page
agent-browser snapshot -s "form" -i                       # Interactive form elements
agent-browser eval "JSON.stringify(                       # Check labels and ARIA
  Array.from(document.querySelectorAll('input,select,textarea'))
    .map(f => ({id: f.id, ariaHidden: f.getAttribute('aria-hidden'), ariaLabel: f.getAttribute('aria-label')}))
)"
```

### Test a user flow
```bash
agent-browser open http://localhost:3000/login
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password"
agent-browser click @e3                                   # Submit button
agent-browser wait ".dashboard"                           # Wait for navigation
agent-browser snapshot -i
```

## Hung or Stuck Sessions

If any `agent-browser` command hangs or times out, stop browser verification immediately. Do not retry the command, probe the stale session, open a replacement session, or attempt recovery in the same task. Report the hang to the user and continue only if they explicitly ask for another browser attempt.

You may capture console output, errors, or a screenshot only when the browser is still responsive. Never run additional `agent-browser` commands against an unresponsive session.

## Tips

- **snapshot** is the go-to for understanding what's on the page — it shows the accessibility tree, which reveals what screen readers see
- Use **eval** for anything the snapshot doesn't cover (computed styles, data attributes, complex DOM queries)
- Refs (`@e1`, `@e2`, ...) are stable within a session until the page changes — take a fresh snapshot after navigation, form submit, or DOM updates
- Use `--session` to isolate tests from each other; use a fresh named session for each feature test
- Prefer `agent-browser wait ".ready-selector"` over long sleeps after sign-in or navigation
- Use `-s` (selector scope) on snapshot to focus on a specific part of the page
