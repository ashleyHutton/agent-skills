---
name: bnb-query
description: Query Brand New Box production databases through the read-only bnb CLI. Use when investigating or reproducing a production bug, inspecting the state of specific production records, or obtaining narrowly scoped production data to recreate a development scenario.
---

# Query Production with BNB

Use `bnb query` to inspect production data when a bug investigation or local reproduction depends on the exact state of specific production records. The command runs SQL in a read-only PostgreSQL transaction.

## Permission is required

**Always ask Ashley for permission before running `bnb query`.** This applies to every production query, including schema discovery, counts, and `EXPLAIN` statements.

Do not ask for generic permission and then return later with the SQL for a second confirmation. First inspect the local code and draft the narrowest useful query. Then make a single approval request that includes:

1. The exact SQL to be run.
2. A brief explanation of what it will retrieve and why.
3. A direct permission question, such as: “I want to run the following read-only production query to inspect this record. May I run it?”

Wait for Ashley's answer, then run that exact query immediately if approved. Approval covers only the query or clearly listed batch shown in that one request. For a materially changed or additional follow-up query, use the same one-step pattern: show the new SQL and ask permission in a single message. Never treat the read-only connection as permission to query automatically.

## Commands

Pass a query directly:

```bash
bnb query "SELECT id, status, created_at FROM orders WHERE id = 12345 LIMIT 1"
```

For multiline or complex SQL, write it to a temporary file and use `--file`:

```bash
bnb query --file /tmp/production-query.sql
```

SQL can also be piped on standard input:

```bash
printf '%s\n' 'SELECT id, status FROM orders WHERE id = 12345 LIMIT 1' | bnb query
```

Agent tool shells on Ashley's machine may load the system Ruby instead of the interactive-shell Ruby required by the current BNB CLI. If plain `bnb query` fails with a Ruby syntax/version error, run it through an interactive shell:

```bash
bash -ic 'bnb query --file /tmp/production-query.sql'
```

Do not interpret that local Ruby error as a production query failure.

## Query safety

Although the connection and transaction are read-only, production data and database capacity still require care:

- Query only after explicit permission.
- Prefer indexed identifiers from the issue or reported record, such as a primary key, UUID, account ID, or exact email when necessary.
- Select explicit columns instead of `SELECT *`.
- Add a small `LIMIT` unless the query is guaranteed to return one row.
- Avoid broad scans, unbounded joins, expensive aggregation, and `EXPLAIN ANALYZE` unless Ashley specifically approves them.
- Retrieve only fields needed to understand or reproduce the behavior.
- Avoid secrets, authentication tokens, credentials, payment data, and unnecessary personal information.
- Do not attempt mutation, transaction control, psql meta-commands, or bypassing the CLI's read-only protections.

The CLI accepts read-only statements beginning with `SELECT`, `WITH`, `VALUES`, `TABLE`, `SHOW`, or `EXPLAIN`. PostgreSQL's read-only transaction is the final enforcement layer.

## Investigation workflow

1. Understand the reported behavior and identify the specific record or state needed.
2. Read the local code and schema before querying production.
3. Draft a minimal query with explicit columns, narrow predicates, and an appropriate limit.
4. In one message, present the exact SQL, explain its purpose, and ask permission to run it. Do not split this into a preliminary permission request and a later SQL confirmation.
5. After approval, execute the approved query with `bnb query` without asking again.
6. Summarize only the relevant findings. Do not expose unrelated sensitive values in the conversation.
7. When recreating the case locally, use the minimum necessary attributes and sanitize personal data. Prefer creating a representative local record rather than copying a production record wholesale.
8. Never write production query output into a tracked repository file. Use a temporary file if output must be retained briefly.

If the first result suggests another query is necessary, draft that query and obtain fresh approval before running it.
