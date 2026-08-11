---
name: kdp-book-issue
description: Handle GitHub issues in the kdp-books repository by planning and producing KDP book assets, metadata, research, docs, and final issue handoff.
---

# KDP Book Issue Workflow

Use this skill when the user asks you to work on a GitHub issue in `ashleyHutton/kdp-books`, especially issues for researching, creating, revising, or publishing KDP paperback / print-on-demand books.

This repository is **not** a Rails/browser application. Do **not** start an app, run `dip`, write Rails specs, or do browser QA unless the user explicitly gives a browser-reproducible task outside the normal book-production workflow.

## 0. Create or adopt a task

If the user shares a GitHub issue URL from `ashleyHutton/kdp-books` and you are not already inside the dedicated task session for it, create a task and start work there.

```text
create_task(
  title: "<issue title>",
  description: "Analyze and plan implementation for GitHub issue #<number>.",
  branch_name: "<existing task branch only if explicitly specified>",
  prompt: "Follow the kdp-book-issue skill for <issue URL>. Include any user notes."
)
```

If you are already in the task branch/session, continue in the current session.

## 1. Read the GitHub issue

Read the issue and every comment:

```bash
gh issue view <number> --repo ashleyHutton/kdp-books --comments
```

Identify:

- Book/change requested
- Audience and positioning
- Acceptance criteria
- Required final filenames
- Metadata constraints, e.g. unknown values must be `TBD`
- Any user comments that override defaults
- Any linked design references

If Figma or other external designs are linked, inspect them only if the needed tooling/auth is available. If access is required but not available, stop and ask the user to set it up.

## 2. Required repository reading before planning

Before writing a plan or editing assets, read the repository rules and relevant patterns:

- `docs/dev/workflow.md`
- `docs/dev/kdp-production-specs.md`
- `docs/dev/cover-generation.md`
- `docs/dev/metadata-schema.md`
- `docs/book-ideas.md`
- `docs/ad-campaigns.md`
- Existing similar book files, especially when creating a related book:
  - `books/crochet-project-journal/build-spec.md`
  - `books/crochet-project-journal/kdp-metadata.yml`
  - `books/crochet-project-journal/README.md`
  - `books/crochet-project-journal/research/`
- Generation scripts under:
  - `scripts/generation/`
  - `scripts/research/` if keyword/ad research scripts are relevant

Follow `AGENTS.md` repository rules:

- One book per directory under `books/`.
- Keep final upload files flat at the top of the book directory.
- Do not create one-file `cover/`, `interior/`, `metadata/`, or `previews/` directories.
- Keep multiple research artifacts under `books/<book-slug>/research/`.
- Use stable final filenames:
  - `books/<book-slug>/<book-slug>-cover.pdf`
  - `books/<book-slug>/<book-slug>-interior.pdf`
  - `books/<book-slug>/kdp-metadata.yml`
- Use `TBD` for unknown/unverified publishing values.
- Do not use copyrighted art, copied interiors, trademarked phrases, brand names, author names, competitor names, fake badges, or copied trade dress.

## 3. Write an implementation plan first

Create `.plans/` if needed and write `.plans/issue<number>.local.md`. These plan files are globally ignored.

Use this structure:

```markdown
# Issue #<number>: <title>

## Issue Details
<Summary of issue and important comments>

## Labels
<Issue labels>

## Scope/Clarification
<What is in and out of scope>

## Design Context
<Linked design context, or "No Figma/mockups linked">

## Bug Verification
N/A — not a browser/app bug report.

## Organizational Patterns
<Repo patterns and similar books/scripts to follow>

## Implementation Plan

### Analysis
<What needs to change and why>

### Tasks
- [ ] Research keywords, market positioning, review-language themes, ad keywords, and top-seller visual patterns ethically.
- [ ] Create/update `books/<book-slug>/` and `research/` structure.
- [ ] Create/update `build-spec.md` with page sequence, fields, KDP specs, and cover strategy.
- [ ] Create/update `kdp-metadata.yml`, using `TBD` for unverified values.
- [ ] Follow `docs/dev/cover-generation.md` for cover workflow, including Nano Banana prompts, cover previews/contact sheet, selection notes, and final cover generation.
- [ ] Select or present cover direction as appropriate.
- [ ] Generate final KDP-ready interior and full-cover PDFs with stable filenames.
- [ ] Update `docs/book-ideas.md`.
- [ ] Update `docs/ad-campaigns.md` and/or book research files if ads are planned.
- [ ] Validate PDFs, metadata, docs, and safety/IP requirements.

#### Final: Asset/Metadata Verification
- [ ] Confirm final PDFs exist with stable filenames.
- [ ] Confirm PDF dimensions/page counts match the book specs and KDP requirements.
- [ ] Confirm `kdp-metadata.yml` has required fields and unknown values marked `TBD`.
- [ ] Confirm `docs/book-ideas.md` is updated with status and repository links.
- [ ] Confirm ad planning docs/research are updated if ads are planned.
- [ ] Confirm no unsafe metadata/art terms are present.

#### Final: GitHub Issue Handoff
- [ ] Commit and push the branch.
- [ ] Apply/create an appropriate final issue label, usually `ready for kdp` when final assets are prepared.
- [ ] Comment on the issue with links to final cover/interior PDFs, metadata, build spec, research, cover contact sheet, and remaining KDP values the user must verify.

### Files to Modify
<List likely created/changed files>

### Notes
<Risks, open questions, and publishing values still needing verification>
```

Display the full plan in the conversation and ask for approval before implementing:

> Here's the implementation plan. Want me to proceed, or would you like to adjust anything?

Do **not** implement until the user approves the plan.

## 4. Research and metadata workflow

For new books, create book-specific research under:

```text
books/<book-slug>/research/
```

Useful files:

- `research-notes.md` — audience, positioning, autocomplete-style terms, competitor positioning patterns, review-language themes, top-seller visual observations, safety/IP notes
- `keyword_candidates.csv`
- `kdp_backend_keywords.txt`
- `amazon_ads_campaign_keywords.csv`
- `cover-concepts/README.md`

Research should be ethical market context only. Do not scrape or copy competitor listings, reviews, author names, artwork, badges, or trade dress.

Metadata must follow `docs/dev/metadata-schema.md`. Common unknown values to keep as `TBD` until KDP/Amazon verifies them:

- ASIN
- Amazon listing URL
- approval date
- publication date
- item weight/dimensions
- confirmed categories
- list price, print cost, royalty
- ad budgets/bids before listing is live

## 5. Cover workflow

Do **not** duplicate the cover process in this skill. Always follow the current repository source of truth: `docs/dev/cover-generation.md`.

When planning or implementing cover work, explicitly reference that doc and use its current requirements for Nano Banana prompts, preview concepts, contact sheets, thumbnail review, selection notes, final full-cover generation, and safety/IP checks.

## 6. Asset generation and validation

Use reproducible scripts under `scripts/generation/` when possible.

Typical generation outputs:

```text
books/<book-slug>/<book-slug>-interior.pdf
books/<book-slug>/<book-slug>-cover.pdf
books/<book-slug>/research/cover-concepts/<book-slug>-concept-a.png
books/<book-slug>/research/cover-concepts/<book-slug>-concept-b.png
books/<book-slug>/research/cover-concepts/<book-slug>-concept-c.png
books/<book-slug>/research/cover-concepts/<book-slug>-concepts-contact-sheet.png
```

Validate PDFs with tools such as `pdfinfo`:

```bash
pdfinfo books/<book-slug>/<book-slug>-interior.pdf | grep -E 'Pages|Page size'
pdfinfo books/<book-slug>/<book-slug>-cover.pdf | grep -E 'Pages|Page size'
```

For a 6 x 9, 120-page paperback using the repository's current white-paper formula, expect:

- Interior: `120` pages, `432 x 648 pts`.
- Full cover: 1 page, approximately `901.457 x 666 pts` (12.520 x 9.25 inches), unless the book-specific spec or KDP calculator differs.

Also scan generated text/docs for leftovers from copied scripts or adjacent books, such as old niche terms.

## 7. Docs to update

For new/active books, update:

- `docs/book-ideas.md` — move from backlog to active/ready/published status and link the book directory.
- `docs/ad-campaigns.md` — add planned campaigns if ads are planned; use `TBD` for bids/budgets if not verified.
- Book-level `README.md` — summarize status, final files, supporting files, and generation scripts.
- Book-level `build-spec.md` and `kdp-metadata.yml`.

If you learn reusable workflow lessons, update relevant docs under `docs/dev/`.

## 8. Final GitHub issue handoff

After implementation and verification:

1. Commit all relevant book assets, metadata, docs, research, and scripts.
2. Push the task branch.
3. Create/apply the final issue label if needed:

```bash
gh label create "ready for kdp" --repo ashleyHutton/kdp-books --description "Final assets and metadata are prepared for KDP upload" --color "0e8a16" || true
gh issue edit <number> --repo ashleyHutton/kdp-books --add-label "ready for kdp"
```

4. Comment on the issue with a KDP-form-ordered publishing checklist. The goal is for the user to scan the issue comment while filling out KDP and copy/paste values in the same order the form asks for them.

Use this structure for the final issue comment:

```markdown
Implementation is ready for KDP review/upload on branch `<branch>`.

## Publishing form values

### Paperback Details

#### Language
- Language: `<language>`

#### Book Title
- Book Title: `<title>`
- Subtitle: `<subtitle or leave blank>`

#### Series
- Series: `<leave blank / series value>`

#### Edition Number
- Edition number: `<leave blank unless this is a later edition>`

#### Author
- Prefix: `<blank/TBD>`
- First name: `<first>`
- Middle name: `<blank/TBD>`
- Last name: `<last>`
- Suffix: `<blank/TBD>`

#### Contributors
- Contributors: `<none / values>`

#### Description
\```text
<description exactly as intended for KDP>
\```

#### Publishing Rights
- Select: `I own the copyright and I hold necessary publishing rights.`

#### Primary Audience
- Sexually explicit images or title: `No`
- Reading age: `<leave blank unless children/YA book>`

#### Primary Marketplace
- Marketplace: `<marketplace>`

#### Categories
- Planned categories:
  1. `<category>`
  2. `<category>`
  3. `<category>`
- Low-content book: `Yes` / `No`
- Large-print book: `No` unless specifically designed as large print

#### Keywords
1. `<keyword box 1>`
2. `<keyword box 2>`
3. `<keyword box 3>`
4. `<keyword box 4>`
5. `<keyword box 5>`
6. `<keyword box 6>`
7. `<keyword box 7>`

#### Publication Date
- Select: `Publication date and release date are the same` unless this is a previously published book.

#### Release Date
- Select: `Release my book for sale now` unless the user wants to schedule release.

### Paperback Content
- Interior PDF: `<link>`
- Cover PDF: `<link>`
- Trim size: `<trim>`
- Page count: `<page count>`
- Ink/paper/bleed: `<values>`

### Paperback Rights & Pricing
- Territories: `All territories` unless user says otherwise.
- Primary marketplace: `<marketplace>`
- List price: `<TBD or value>`
- Royalty / print cost: `<TBD until KDP calculator>`

## Repository files
- Metadata: `<link>`
- Build spec: `<link>`
- Book README: `<link>`
- Research folder: `<link>`
- Cover concept contact sheet: `<link>`
- Ad keyword plan: `<link, if present>`

## Verification completed
- Interior PDF: `<page count and dimensions>`
- Cover PDF: `<dimensions>`
- Metadata YAML parses and includes required sections.
- Unknown publishing/listing values are marked `TBD`.

## Still needed during/after KDP publishing
- Confirm KDP preview approval for cover/interior.
- Confirm list price, print cost, and royalty in KDP.
- Confirm final KDP categories.
- Add ASIN, Amazon listing URL, approval/publication date, and Amazon item weight/dimensions after approval.
- Set ad campaign budgets/bids once the listing is live, if ads are planned.
```

For fields not shown in the user's current screenshot/page, still include placeholders under the later KDP sections if the value is already known from metadata; otherwise use `TBD`.

Do not close the issue unless the user explicitly asks.

## 9. What not to do

- Do not start Rails or browser apps for normal book-production issues.
- Do not write Rails specs or invent app test commands.
- Do not create one-file final asset subdirectories.
- Do not guess publishing values; use `TBD`.
- Do not use copyrighted art, copied interiors, trademarks, brand names, competitor names, fake badges, or copied cover trade dress.
- Do not comment on PR review comments; just make changes and push if PR work is involved.
