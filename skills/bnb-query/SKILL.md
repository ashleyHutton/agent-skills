---
name: bnb-query
description: Query Brand New Box production databases read-only through the bnb_mcp integration in the executor MCP server, falling back to the bnb CLI. Use when investigating or reproducing a production bug, inspecting the state of specific production records, or obtaining narrowly scoped production data to recreate a development scenario.
---

# Query Production with BNB

Query production data when a bug investigation or local reproduction depends on the exact state of specific production records. Queries run in a read-only PostgreSQL transaction.

Use the `bnb_mcp` integration in the `executor` MCP server by default. Fall back to the `bnb query` CLI only when executor or the `bnb_mcp` connection is unavailable or failing.

## Authorization

Ashley has authorized read-only production queries (through executor or `bnb query`) during production investigations. No query requires a separate approval request, including follow-up queries. Keep queries within the user's task and the query safety limits below. Explain the purpose and relevant findings in the conversation without requiring a separate SQL confirmation step.

A request to investigate a particular production issue does not authorize unrelated exploration. If a useful query would be broad, expensive, or require sensitive fields, narrow its scope where possible and use only what the investigation needs.

## Executor (default)

Use executor's `execute` tool, which runs TypeScript with access to `tools.bnb_mcp.*`. The tool is `tools.bnb_mcp.user.personalBnbMcp.query` and takes `{ cluster_id, namespace, deployment, sql }`. Read the target from the app's `.bnb/.rancherrc.yml`:

```yaml
namespace: atlas-navigator-production   # -> namespace
deployment_name: web-deployment         # -> deployment
rancher_project_id: c-7dqlz:p-ttg76     # cluster_id is the part before the colon: c-7dqlz
```

```ts
const result = await tools.bnb_mcp.user.personalBnbMcp.query({
  cluster_id: "c-7dqlz",
  namespace: "atlas-navigator-production",
  deployment: "web-deployment",
  sql: "SELECT id, status, created_at FROM orders WHERE id = 12345 LIMIT 1",
});
if (!result.ok) return result.error;
return result.data.content[0].text;
```

The result text is psql's output. Each query starts a short-lived pod, so it takes several seconds. Each statement is cancelled after 30 seconds, and output over 256 KB is cut off.

## CLI (fallback)

Run from the app's directory so the CLI picks up `.bnb/.rancherrc.yml`. Pass a query directly:

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

- Keep queries within the scope of the user's investigation.
- Prefer indexed identifiers from the issue or reported record, such as a primary key, UUID, account ID, or exact email when necessary.
- Select explicit columns instead of `SELECT *`.
- Add a small `LIMIT` unless the query is guaranteed to return one row.
- Avoid broad scans, unbounded joins, expensive aggregation, and `EXPLAIN ANALYZE` unless necessary for the investigation.
- Retrieve only fields needed to understand or reproduce the behavior.
- Avoid secrets, authentication tokens, credentials, payment data, and unnecessary personal information.
- Do not attempt mutation, transaction control, psql meta-commands, or bypassing the read-only protections.

Both executor and the CLI accept only read-only statements beginning with `SELECT`, `WITH`, `VALUES`, `TABLE`, `SHOW`, or `EXPLAIN`. PostgreSQL's read-only transaction is the final enforcement layer.

## Investigation workflow

1. Understand the reported behavior and identify the specific record or state needed.
2. Read the local code and schema before querying production.
3. Run minimal read-only queries with explicit columns, narrow predicates, and an appropriate limit. Follow-up queries within the same investigation do not need separate approval.
4. Summarize only the relevant findings. Do not expose unrelated sensitive values in the conversation.
5. When recreating the case locally, use the minimum necessary attributes and sanitize personal data. Prefer creating a representative local record rather than copying a production record wholesale.
6. Never write production query output into a tracked repository file. Use a temporary file if output must be retained briefly.
