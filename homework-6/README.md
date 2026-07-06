# Transaction Processing Pipeline

**Student Name**: Yevhen Kulinichenko AAI02
**Date Submitted**: 06.07.2026
**AI Tools Used**: Claude Code

## What this is

This is a Node.js capstone project that implements a file-based, three-stage
transaction processing pipeline: **validation -> fraud detection ->
settlement**. `orchestrator.js` loads the 8 sample records from
`sample-transactions.json`, drops each one into `shared/input/`, and threads
it through `pipeline/validator.js`, `pipeline/fraud-detector.js`, and
`pipeline/settlement.js` in sequence, using plain JSON files under `shared/`
as the hand-off/message-passing mechanism between stages (rather than an
in-memory call chain). Every stage reads its input as a JSON envelope, adds
its own decision to the `data` payload, and writes the envelope back out for
the next stage to pick up; the final settlement record for each transaction
lands in `shared/results/<transaction_id>.json`, plus an aggregate
`shared/results/summary.json`.

Monetary amounts are parsed and compared with `decimal.js` (never native
`Number`/`parseFloat`) so cent-level precision is never lost, and every
stage emits a PII-safe audit log line (timestamp, stage, `transaction_id`,
outcome only — never account numbers, names, or descriptions) via
`lib/logger.js`. Once a pipeline run has produced results, they're
queryable two ways: an Express front-end (`frontend/server.js`) that can
trigger a fresh run and renders the summary/per-transaction table in a
browser, and a custom Model Context Protocol server
(`mcp/server.js`, registered as `pipeline-status` in `mcp.json`) that
exposes `get_transaction_status` and `list_pipeline_results` tools plus a
`pipeline://summary` resource for any MCP-capable client (e.g. Claude
Code).

## Pipeline stage responsibilities

- **Orchestrator** (`orchestrator.js`) — ensures `shared/{input,processing,output,results}/`
  exist, loads all records from `sample-transactions.json`, drives each
  record through the three stages by calling their `processTransaction()`
  functions directly, persists the intermediate and final JSON envelopes at
  each hand-off point, and writes `shared/results/summary.json` with
  totals per `final_status`. Exposed as `runPipeline()` so the CLI, the
  front-end, and the test suite can all call it programmatically.
- **Validator** (`pipeline/validator.js`) — checks that every required field
  is present, parses `amount` with `decimal.js` (rejecting non-numeric
  strings as `invalid_amount`), validates `currency` against an ISO 4217
  allow-list (`USD`, `EUR`, `GBP`, `JPY`; e.g. `TXN006`'s `XYZ` is rejected
  as `invalid_currency`), and enforces the refund sign rule: a negative
  `amount` is only allowed when `transaction_type === 'refund'` (e.g.
  `TXN007`'s `-100.00` is normalized to `"100.00"` via `Decimal.abs()`),
  and rejected as `negative_amount_not_allowed` for any other type. Also
  ships a `--dry-run` CLI mode that validates the sample data without
  touching `shared/`.
- **Fraud detector** (`pipeline/fraud-detector.js`) — scores every
  non-rejected transaction 0-100 by summing risk factors against
  `data`: `high_value` (amount > $10,000, +40), `very_high_value` (amount >
  $50,000, +20 additional), `unusual_timing` (UTC hour 00:00-06:00, +20),
  `cross_border` (`metadata.country !== "US"`, +15), and `wire_transfer`
  (+10). A score >= 60 sets `status: 'flagged_fraud'`; a score > 0 but < 60
  sets `status: 'reviewed'`; a score of 0 leaves `status: 'validated'`.
  Rejected records pass through unscored.
- **Settlement** (`pipeline/settlement.js`) — turns each stage-2 status
  into a `final_status`: `rejected` stays `rejected` (reason preserved),
  `flagged_fraud` becomes `held_for_review` (never auto-settled), and
  anything else (`validated`/`reviewed`) becomes `settled` with a
  `settled_at` timestamp. Its output is exactly what gets written to
  `shared/results/<transaction_id>.json`.

Running the pipeline against the 8 records in `sample-transactions.json`
currently produces: `TXN006` `rejected` (invalid currency `XYZ`); `TXN005`
`held_for_review` (risk score 70 — `high_value` + `very_high_value` +
`wire_transfer`); and `TXN001`, `TXN002`, `TXN003`, `TXN004`, `TXN007`,
`TXN008` all `settled` (`TXN002` scores 50 — `high_value` + `wire_transfer`
— which is below the 60-point flag threshold, so it is reviewed and settled
rather than held; see the design note in `pipeline/fraud-detector.js` for
why this reading of the spec was chosen).

## Architecture

```
                        sample-transactions.json
                                  |
                                  v
                          orchestrator.js
              (ensures shared/{input,processing,output,results}/,
                 drives every record through the 3 stages below)
                                  |
                                  v
                        shared/input/<id>.json
                                  |
                                  v
                    +-------------------------+
                    |   pipeline/validator.js  |
                    | required fields, decimal |
                    |  amount, ISO 4217 code,  |
                    |     refund sign rule     |
                    +-------------------------+
                                  |
                                  v
                    +----------------------------+
                    | pipeline/fraud-detector.js |
                    |  0-100 risk score, factors |
                    | -> validated/reviewed/     |
                    |    flagged_fraud           |
                    +----------------------------+
                                  |
                                  v
                    +-------------------------+
                    |  pipeline/settlement.js  |
                    | -> settled / rejected /  |
                    |   held_for_review        |
                    +-------------------------+
                                  |
                                  v
              shared/results/<id>.json + summary.json
                                  |
                +-----------------+-----------------+
                v                                    v
      Express front-end                    MCP server (pipeline-status)
   frontend/server.js                        mcp/server.js
   npm run frontend -> :3000                 get_transaction_status
   renders summary + per-txn table           list_pipeline_results
                                              pipeline://summary resource
```

(Each stage's JSON envelope is also mirrored into `shared/processing/` and
`shared/output/` as it moves through the pipeline — see
`specification.md` and `.claude/agents/pipeline-codegen.md` for the full
file-based message-passing contract.)

## Tech stack

| Layer | Technology | Version (`package.json`) | Purpose |
|---|---|---|---|
| Runtime | Node.js | tested with v26.4.0 (CommonJS, `"type": "commonjs"`) | Runs the pipeline, front-end, and MCP server |
| Money math | `decimal.js` | `^10.6.0` | Arbitrary-precision `Decimal` amount parsing/comparison, never native `Number` |
| Web server | `express` | `^5.2.1` | Front-end HTTP API + static UI (`frontend/server.js`) |
| IDs | `uuid` | `^14.0.1` | `message_id` (uuid v4) on every pipeline envelope |
| Schema validation | `zod` | `^4.4.3` | Input schemas for the MCP server's tools |
| MCP integration | `@modelcontextprotocol/sdk` | `^1.29.0` | `pipeline-status` MCP server (`mcp/server.js`, `mcp.json`) exposing pipeline results to MCP clients |
| Testing | `jest` | `^30.4.2` | Unit + integration test suite under `tests/`, run via `npm test` |
| Testing | `supertest` | `^7.2.2` | HTTP-level tests against the Express front-end |

## Docs and workflow

- [`specification.md`](specification.md) — the full pipeline specification (objectives, implementation notes, per-stage low-level tasks) that the code in `pipeline/` and `orchestrator.js` was built from.
- [`HOWTORUN.md`](HOWTORUN.md) — copy-pasteable steps to install, run the pipeline, run the front-end, run the MCP server, and run the tests.
- [`research-notes.md`](research-notes.md) — context7 library research (`decimal.js`, Express 5, `@modelcontextprotocol/sdk`) performed before implementing the pipeline and front-end.
- [`.claude/agents/`](.claude/agents/) — the four-subagent workflow used to build this capstone: `spec-writer` (Agent 1, produces `specification.md`), `pipeline-codegen` (Agent 2, implements the pipeline/front-end), `unit-test-writer` (Agent 3, writes/maintains the Jest suite), and `docs-writer` (Agent 4, produces this README and `HOWTORUN.md`).
- [`.claude/commands/run-pipeline.md`](.claude/commands/run-pipeline.md) and [`.claude/commands/validate-transactions.md`](.claude/commands/validate-transactions.md) — custom Claude Code skills (`/run-pipeline`, `/validate-transactions`) that wrap the CLI entry points above with readable, tabular reporting.
