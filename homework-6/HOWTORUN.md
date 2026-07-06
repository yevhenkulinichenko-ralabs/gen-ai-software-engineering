# How to Run

Copy-pasteable steps to set up, run, and test the transaction processing
pipeline. All commands below assume your shell's current directory is the
repo root (`homework-6/`) and were verified against Node.js v26.4.0.

## 1. Environment setup

Requires Node.js (tested with v26.4.0; any recent Node 18+ LTS should work
since the project only uses `fs`/`path`/`child_process` from core plus the
dependencies below) and npm.

```
npm install
```

This installs the runtime dependencies (`express`, `decimal.js`, `uuid`,
`zod`, `@modelcontextprotocol/sdk`) and dev dependencies (`jest`,
`supertest`) declared in `package.json`.

## 2. Run the pipeline

Run the full transaction pipeline (validator -> fraud detector ->
settlement) against `sample-transactions.json`:

```
npm run pipeline
```

(equivalent to `node orchestrator.js`). This ensures
`shared/{input,processing,output,results}/` exist, processes all 8 sample
records, and prints a human-readable summary, e.g.:

```
Transaction Pipeline Summary
=============================
Total:            8
Settled:          6
Rejected:         1
Held for review:  1

Notable transactions:
  TXN005: held_for_review
  TXN006: rejected (invalid_currency)
```

It populates `shared/input/`, `shared/processing/`, `shared/output/`, and
writes one final record per transaction plus `shared/results/summary.json`
into `shared/results/`. The exit code is 0 even when some transactions are
rejected/held; it only exits non-zero on an unhandled exception.

Alternatively, from Claude Code, run the `/run-pipeline` skill (see step 6)
for the same result rendered as markdown tables.

To validate the sample data only (no fraud scoring, no settlement, and no
writes to `shared/`), run:

```
node pipeline/validator.js --dry-run
```

## 3. Run the front-end

Start the Express front-end (serves a static UI backed by the same
`runPipeline()` used by the CLI):

```
npm run frontend
```

(equivalent to `node frontend/server.js`). It listens on
`http://localhost:3000/` by default — open that URL in a browser. Click
**Run Pipeline** to trigger a fresh pipeline run; the summary counts
(total / settled / rejected / held for review) and the per-transaction
results table update from the JSON response of `POST /api/run-pipeline`.
On page load, any existing `shared/results/summary.json` is fetched via
`GET /api/results` and rendered automatically if present.

`PORT` can be set as an environment variable to override the default port
(3000), e.g. `PORT=4000 npm run frontend`.

Stop the server with `Ctrl+C` when you're done.

## 4. Run the MCP server

The repo ships a custom MCP server (`mcp/server.js`, registered as
`pipeline-status` in `mcp.json` alongside `context7`) that reads
`shared/results/` and exposes it to any MCP-capable client over stdio.

To run it directly (mostly useful for a manual stdio smoke test — it just
waits for an MCP client to connect and print nothing on success):

```
npm run mcp
```

(equivalent to `node mcp/server.js`). In practice you don't run this by
hand; instead point an MCP client (e.g. Claude Code, Claude Desktop) at the
repo's `mcp.json`, which already declares how to launch it:

```json
{
  "mcpServers": {
    "context7": { "command": "npx", "args": ["-y", "@upstash/context7-mcp@latest"] },
    "pipeline-status": { "command": "node", "args": ["mcp/server.js"] }
  }
}
```

Once connected, the client can call:
- **`get_transaction_status`** (input: `transaction_id`, e.g. `"TXN001"`) — returns that transaction's final settlement record from `shared/results/`, or a not-found message if it hasn't been processed yet.
- **`list_pipeline_results`** (no input) — returns total count and counts/`transaction_id`s grouped by `final_status`.
- **resource `pipeline://summary`** — the raw contents of `shared/results/summary.json`.

Run `npm run pipeline` at least once first so `shared/results/` has data
for these tools to read.

## 5. Run the tests and check coverage

```
npx jest --coverage
```

or equivalently:

```
npm test
```

(`package.json`'s `test` script is `jest --coverage`.) This runs the full
Jest suite under `tests/` (`validator.test.js`, `fraud-detector.test.js`,
`settlement.test.js`, `orchestrator.integration.test.js`) — 29 tests across
4 suites at the time of writing — and prints a coverage table. The suite
isolates itself from the real `shared/` directories (via a temp base
directory passed to `runPipeline({ baseDir, sampleFile })`), so running it
never touches the pipeline output produced in step 2.

Current coverage: **94.94% line coverage** (95.07% statements, 87.17%
branches, 100% functions), above the 80% line-coverage gate enforced by
`scripts/check-coverage.js` — a `PreToolUse` hook (see
`.claude/settings.json`) that runs `jest --coverage` and blocks any `git
push` command if line coverage drops below 80%.

## 6. Use the custom skills

Two Claude Code skills wrap the CLI entry points above with readable,
tabular reporting (definitions under `.claude/commands/`):

- **`/run-pipeline`** — clears `shared/{input,processing,output,results}/`, runs `node orchestrator.js`, reads `shared/results/summary.json`, and renders a markdown summary table plus a table of any rejected/held-for-review transactions with reasons.
- **`/validate-transactions`** — runs `node pipeline/validator.js --dry-run` (read-only with respect to `shared/`) and renders a markdown table of every transaction's validation status and rejection reason (if any).

Invoke either by typing the slash command in a Claude Code session in this
repo.

## 7. Where to find results

- **`shared/results/`** — one `<transaction_id>.json` file per processed transaction (the final settlement envelope) plus `summary.json` (aggregate totals and a per-transaction outcome list). This is the source of truth written by `orchestrator.js`.
- **The front-end** — `http://localhost:3000/` (step 3) renders the same summary and per-transaction table in a browser, either from an existing `summary.json` on load or from a fresh run triggered by the **Run Pipeline** button.
- **The MCP server** — `get_transaction_status`, `list_pipeline_results`, and the `pipeline://summary` resource (step 4) let any MCP-capable client query `shared/results/` programmatically without opening the browser or the raw JSON files.
