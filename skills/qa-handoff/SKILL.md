---
name: qa-handoff
description: Prepare test data and links for manual QA. Creates records in the correct states so the user can test the feature in the browser, then provides Tailscale URLs to the relevant pages. Use at the end of a feature implementation or when the user asks to set up test data.
---

# QA Handoff

Create test data for manual verification and provide browser links.

## When to use

- After finishing implementation and browser verification in the github-issue workflow (final step).
- When the user explicitly asks to set up test data for manual testing.

## Steps

### 1. Identify what to test

Look at the current context to understand what was just built or what the user wants to test:
- Check the git diff (`git diff main --stat` and `git diff main`) to see what changed.
- Check for plan files in `.plans/`.
- Look at the models, controllers, and views that were modified.

From this, determine:
- Which pages the user needs to visit.
- What records need to exist (and in what states) to exercise the feature.
- What variations matter (e.g., different statuses, different user roles, edge cases like empty lists).

### 2. Check existing data

Before creating records, check what already exists:

```bash
dip rails runner "<query to check existing records>"
```

Don't create duplicates if suitable records already exist. But DO create records if the existing data doesn't cover the states/variations needed to test the feature.

### 3. Create test records

Use `dip rails runner` with a script that creates the records. Follow these rules:

- **Use FactoryBot** if factories exist (check `spec/factories/`). Fall back to direct `Model.create!` if not.
- **Create realistic data** — use plausible names, amounts, and dates. Don't use "Test 1", "Test 2" style names.
- **Cover the interesting states** — if the feature involves filtering by status, create records in each status. If it involves different user roles, ensure the right associations exist.
- **Don't delete or modify existing records** — only add new ones.
- **Print a summary** of what was created so you can report it to the user.

Example pattern:
```bash
dip rails runner '
  # Create records for testing the salesperson filter
  alice = User.find_or_create_by!(email: "alice@test.com") { |u| u.name = "Alice Johnson"; u.password = "password"; u.role = "salesperson" }
  # ... more records ...
  puts "Created: ..."
'
```

### 4. Build and present links

Construct Tailscale URLs to the pages the user should visit. Use the hostname from the machine-level AGENTS.md (check `~/AGENTS.md` for the Tailscale hostname).

Present the output in this format:

---

**QA ready!** Here's what I set up and where to test:

**Test data created:**
- <description of record 1>
- <description of record 2>
- ...

**Test in browser:**
- <Page name>: <Tailscale URL>
- <Page name with filter>: <Tailscale URL with query params>
- ...

**What to verify:**
- <Specific thing to check 1>
- <Specific thing to check 2>
- ...

---

### 5. Login credentials

If the user needs to sign in as a specific user to test, include the credentials. Check for seeded users first:

```bash
dip rails runner "User.where(admin: true).or(User.where(role: 'salesperson')).pluck(:email, :role, :admin)"
```

Include the relevant user's email and note that the password is typically `password` for dev-seeded users.

## Tips

- Think about the feature from the user's perspective — what would they click through to verify it works?
- If the feature has filters, provide direct links WITH the filter params pre-set so the user can see the filtered view immediately.
- If the feature is role-dependent, mention which user to sign in as.
- Keep it concise — the user wants to click links and verify, not read a novel.
