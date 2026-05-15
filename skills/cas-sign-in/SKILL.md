---
name: cas-sign-in
description: Sign in to TASN apps via CAS SSO (accounts.ksdetasn.org) using agent-browser. Use before any browser-based verification of authenticated TASN pages.
---

# CAS Sign-In

Automate CAS SSO login for any TASN app that authenticates through `accounts.ksdetasn.org`. Use this skill whenever you need agent-browser to access a page that requires authentication.

## Setup

CAS credentials must be set as environment variables in `~/.bashrc`:

```bash
export CAS_USERNAME="your-email@example.com"
export CAS_PASSWORD="your-password"
```

After adding them, reload: `source ~/.bashrc`

## Prerequisites

- The **agent-browser** skill must be loaded (this skill uses agent-browser commands)
- On this machine, Node.js is too old for agent-browser directly. Use `bun` to invoke it:
  ```bash
  AB="bun /home/ashley/.bun/install/global/node_modules/agent-browser/bin/agent-browser.js"
  ```
  Then use `$AB <command>` instead of `agent-browser <command>` in all steps below.

## Important: Dev Environments Only

**Only use this skill against local/dev URLs** (e.g. `localhost`, `garibaldi.tail0349c.ts.net`, or other dev servers). Never attempt to sign in on production domains like `ksdetasn.org`, `kpiconnect.org`, etc.

## Sign-In Flow

Use a named session to preserve auth cookies across commands.

### Step 1: Open the protected page

```bash
$AB --session cas open <protected-url>
```

### Step 2: Check if sign-in is needed

```bash
$AB --session cas get url
```

- If the URL contains `accounts.ksdetasn.org` → you were redirected to CAS login, proceed to Step 3.
- If the URL is still the protected page → you are already signed in, skip to Step 6.

### Step 3: Take a snapshot to find the form fields

```bash
$AB --session cas snapshot -i
```

Look for these interactive elements (the ref numbers may vary):
- A textbox labeled **"Email"**
- A textbox labeled **"Password"**
- A button labeled **"Login"**

### Step 4: Fill in credentials and submit

```bash
$AB --session cas fill @<email-ref> "$CAS_USERNAME"
$AB --session cas fill @<password-ref> "$CAS_PASSWORD"
$AB --session cas click @<login-button-ref>
```

Replace `@<email-ref>`, `@<password-ref>`, and `@<login-button-ref>` with the actual `@eN` refs from the snapshot.

### Step 5: Wait for redirect back to the app

```bash
$AB --session cas wait 3000
$AB --session cas get url
```

Verify the URL is now on the original app domain (not `accounts.ksdetasn.org`). If still on the CAS page, check for error messages:

```bash
$AB --session cas snapshot -c
```

Common failures:
- **"Invalid email or password"** → credentials are wrong, check env vars
- **Still on CAS page with no error** → increase wait time or check for a TOTP/MFA step

### Step 6: Continue with authenticated browsing

The session now has valid auth cookies. All subsequent commands using the same `--session cas` will be authenticated:

```bash
$AB --session cas open <another-protected-url>
$AB --session cas snapshot
```

## Complete Example

```bash
# Define the agent-browser alias
AB="bun /home/ashley/.bun/install/global/node_modules/agent-browser/bin/agent-browser.js"

# Open a protected TASN page on the dev server (never use production URLs)
$AB --session cas open http://garibaldi.tail0349c.ts.net:3000/admin

# Confirm we're on the CAS login page
$AB --session cas get url

# Find form field refs
$AB --session cas snapshot -i

# Fill and submit (replace refs with actual values from snapshot)
$AB --session cas fill @e3 "$CAS_USERNAME"
$AB --session cas fill @e4 "$CAS_PASSWORD"
$AB --session cas click @e5

# Wait for redirect and confirm
$AB --session cas wait 3000
$AB --session cas get url

# Now browse authenticated pages
$AB --session cas snapshot -i
```

## Notes

- **Session persistence:** Auth cookies live in the `cas` session. Use `--session cas` for all commands that need auth.
- **Session cleanup:** Close the session when done with `$AB --session cas close`.
- **Multiple apps:** CAS SSO means one login works across all TASN apps (`ksdetasn.org`, `kpiconnect.org`, etc.) within the same session, as long as they share the same CAS server.
- **Never hardcode credentials.** Always read from `$CAS_USERNAME` and `$CAS_PASSWORD` environment variables.
