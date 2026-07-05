# Transaction Processing Pipeline Specification

> Ingest the information from this file, implement the Low-Level Tasks, and generate the code that will satisfy the High and Mid-Level Objectives.

## High-Level Objective

Build a Node.js/Express-compatible, file-based transaction processing pipeline that validates, fraud-scores, and settles the transactions in `sample-transactions.json` in sequence (validator -> fraud detector -> settlement), orchestrated end-to-end and reported on in `shared/results/`.

## Mid-Level Objectives

- **Validation** accepts records with all required fields, a valid `decimal.js` amount, and an ISO 4217 currency; it rejects **TXN006** (currency `XYZ`) with a `reason` field, and it normalizes rather than rejects the negative refund amount on **TXN007** (`transaction_type: "refund"`, `amount: "-100.00"`) per a documented sign rule, while a hypothetical negative amount on a non-refund type is rejected.
- **Fraud Detection** computes a 0-100 risk score per validated transaction from four factors — high value (> $10,000), unusual timing (00:00-06:00 UTC), cross-border (`metadata.country !== "US"`), and a `wire_transfer` multiplier — such that **TXN002** ($25,000 `wire_transfer`, US) and **TXN005** ($75,000 `wire_transfer`, US) score high enough to be flagged for review, and **TXN004** (02:47 UTC, `EUR`, `metadata.country: "DE"`) accumulates both the unusual-timing and cross-border factors despite being a small $500 transfer.
- **Settlement Processing** marks validated, non-flagged transactions (e.g. **TXN001**, **TXN003**, **TXN004**, **TXN007**, **TXN008**) as `settled` with a `settled_at` timestamp and writes one final JSON record per transaction to `shared/results/`; transactions flagged as high-risk fraud (**TXN002**, **TXN005**) are held for review rather than settled; transactions rejected in validation (**TXN006**) keep their rejection reason through to the final record.
- **Orchestration** loads all 8 records from `sample-transactions.json`, drops each into `shared/input/`, threads every record through the three stages via the file-based protocol (`shared/input/` -> `shared/processing/` -> `shared/output/` -> `shared/results/`), and writes a `shared/results/summary.json` report with total/settled/rejected/held-for-review counts and a per-transaction outcome list.
- Every stage logs each decision through a shared audit logger using an ISO 8601 timestamp, stage name, `transaction_id`, and outcome — with **no plaintext logging of account numbers (e.g. `ACC-1001`) or names/descriptions** at any stage.

## Implementation Notes

- **Monetary values**: use `decimal.js` (already a dependency in `package.json`) for every amount comparison and calculation; never coerce amounts to native `Number`/`parseFloat` for money math. Amounts in `sample-transactions.json` are strings (e.g. `"1500.00"`, `"-100.00"`) and must be parsed with `new Decimal(...)`.
- **Currency codes**: validate against a small ISO 4217 allow-list (at minimum `USD`, `EUR`, `GBP`, `JPY`); any code outside the list — e.g. `XYZ` on **TXN006** — is a validation failure with an explicit `reason`.
- **Refund sign rule** (must be decided and documented in code comments and/or `README.md`): refunds (`transaction_type: "refund"`) are the only transaction type allowed to carry a negative amount in the source data; the validator normalizes the stored `amount` to its absolute value via `Decimal.abs()` and does not reject the record solely for being negative. A negative amount on any other `transaction_type` is a validation failure.
- **Audit logging**: every stage logs via a shared, PII-safe logger utility (e.g. `lib/logger.js`) emitting a structured line per event with `timestamp` (ISO 8601), `stage`, `transaction_id`, and `outcome`. Never log the full record, `source_account`/`destination_account`, or `description` fields in plaintext.
- **Module system**: `package.json` declares `"type": "commonjs"`; all pipeline files are CommonJS modules using `module.exports`.
- **Message envelope**: stages communicate via the standard JSON envelope from `TASKS.md` (`message_id` via `uuid`, ISO 8601 `timestamp`, `source_stage`, `target_stage`, `message_type`, and a `data` payload carrying the transaction fields plus stage-added fields such as `status`, `risk_score`, `risk_factors`, `final_status`).
- **File-based protocol**: `shared/input/`, `shared/processing/`, `shared/output/`, and `shared/results/` already exist (currently placeholder `.gitkeep` files only) and must be used as the hand-off points between stages, one JSON file per `transaction_id`.
- **Dependencies available** (from `package.json`): `decimal.js`, `express`, `uuid`, `@modelcontextprotocol/sdk`, `jest`/`supertest` for tests. Do not introduce a different runtime or add heavyweight new dependencies for logic the above already covers.

## Context

### Beginning context
- `sample-transactions.json` at the repo root — 8 raw transaction records (`TXN001`-`TXN008`) covering currencies `USD`/`EUR`/`GBP`/`XYZ`, transaction types `transfer`/`wire_transfer`/`refund`, one invalid currency (`TXN006`, `XYZ`), and one negative amount (`TXN007`, refund, `-100.00`).
- `shared/input/`, `shared/processing/`, `shared/output/`, `shared/results/` — empty directories with `.gitkeep` placeholders only; no pipeline has run yet.
- `package.json` — dependencies (`decimal.js`, `express`, `uuid`, `@modelcontextprotocol/sdk`) and dev dependencies (`jest`, `supertest`) already installed; `npm run pipeline` is wired to `node orchestrator.js` but that file does not exist yet.
- No `pipeline/` directory and no `orchestrator.js` exist yet.

### Ending context
- `pipeline/validator.js`, `pipeline/fraud-detector.js`, `pipeline/settlement.js` — each exporting `processTransaction`, implementing the three stages described above.
- `orchestrator.js` at the repo root — exporting `runPipeline()` and runnable via `node orchestrator.js` / `npm run pipeline`.
- Running the orchestrator processes all 8 records from `sample-transactions.json` and produces one result file per transaction (e.g. `shared/results/TXN001.json` ... `shared/results/TXN008.json`) plus `shared/results/summary.json`, with `TXN006` rejected, `TXN002`/`TXN005` held for review, and the remaining 5 transactions settled.
- A shared PII-safe audit logger (e.g. `lib/logger.js`) used by all three stages.
- `shared/input/`, `shared/processing/`, `shared/output/` populated with the intermediate per-transaction JSON envelopes produced along the way, in addition to the final records in `shared/results/`.

## Low-Level Tasks

### 1. Validation Stage

Task: Validation Stage

Prompt: "Implement `pipeline/validator.js` as a CommonJS module exporting `function processTransaction(record)`. `record` is a raw transaction object shaped like an entry in `sample-transactions.json` (fields: `transaction_id`, `timestamp`, `source_account`, `destination_account`, `amount` (string), `currency`, `transaction_type`, `description`, `metadata.channel`, `metadata.country`). Check that all required fields are present; parse `amount` with `decimal.js` (reject non-numeric strings, never use `Number`/`parseFloat`); validate `currency` against an ISO 4217 allow-list (`USD`, `EUR`, `GBP`, `JPY` at minimum) and reject unknown codes such as `XYZ`; allow a negative `amount` only when `transaction_type === 'refund'`, normalizing it to its absolute value with `Decimal.abs()`, and reject a negative amount for any other transaction type. Return a message envelope: `{ message_id (uuid v4), timestamp (ISO 8601 now), source_stage: 'validator', target_stage: 'fraud_detector', message_type: 'transaction', data: { ...original fields, amount: normalized decimal string, status: 'validated' | 'rejected', reason? } }`. Log every decision (timestamp, stage, transaction_id, outcome) through a shared PII-safe logger utility — never log `source_account`, `destination_account`, or `description`. Also add a CLI entry point guarded by `if (require.main === module)` so that `node pipeline/validator.js --dry-run` reads `sample-transactions.json`, runs every record through `processTransaction`, and prints a total/valid/invalid summary table with rejection reasons, without writing anything to `shared/`."

File to CREATE: `pipeline/validator.js`

Function to CREATE: `function processTransaction(record: object): object`

Details:
- Required fields: `transaction_id`, `source_account`, `destination_account`, `amount`, `currency`, `transaction_type`, `timestamp`. Missing any -> `status: 'rejected'`, `reason: 'missing_required_field:<field>'`.
- `amount` must parse as a `decimal.js` `Decimal`; a non-numeric string -> rejected with `reason: 'invalid_amount'`.
- `currency` must be in the ISO 4217 allow-list; **TXN006** (`currency: "XYZ"`) is the concrete rejection example (`reason: 'invalid_currency'`).
- Negative `amount` is allowed only for `transaction_type === 'refund'`; **TXN007** (`amount: "-100.00"`, `transaction_type: "refund"`) is normalized to `"100.00"` and marked `validated`; a negative amount on any other type is rejected with `reason: 'negative_amount_not_allowed'`.
- All other sample records (**TXN001**-**TXN005**, **TXN008**) pass validation unchanged aside from the standard envelope wrapping.

### 2. Fraud Detection Stage

Task: Fraud Detection Stage

Prompt: "Implement `pipeline/fraud-detector.js` as a CommonJS module exporting `function processTransaction(message)`, where `message` is the envelope produced by `pipeline/validator.js`. If `message.data.status === 'rejected'`, pass the record through unchanged (no scoring) to the next stage. Otherwise compute a `riskScore` (0-100, capped at 100) by summing these factors against `message.data`: amount > 10000 -> +40 (`high_value`); amount > 50000 -> an additional +20 (`very_high_value`); transaction hour in UTC between 00:00 and 06:00 (via `new Date(timestamp).getUTCHours()`) -> +20 (`unusual_timing`); `metadata.country !== 'US'` -> +15 (`cross_border`); `transaction_type === 'wire_transfer'` -> +10 (`wire_transfer`). Set `data.risk_score` and `data.risk_factors` (array of the triggered factor names). If `riskScore >= 60`, set `data.status = 'flagged_fraud'`; else if `riskScore > 0`, set `data.status = 'reviewed'`; else leave `data.status` as `'validated'`. Return the envelope with `source_stage: 'fraud_detector'`, `target_stage: 'settlement'`. Log stage, transaction_id, and outcome (status + risk_score) via the shared logger, with no PII."

File to CREATE: `pipeline/fraud-detector.js`

Function to CREATE: `function processTransaction(message: object): object`

Details:
- Rejected records (from validation) pass through untouched — e.g. **TXN006** stays `rejected` with its `reason`, and receives no `risk_score`.
- **TXN002** ($25,000, `wire_transfer`, US, 09:15 UTC): `high_value` (+40) + `wire_transfer` (+10) = 50 -> below the 60 threshold on value alone, but combined with any other applicable factor should be verified against the 60-point `flagged_fraud` threshold; document the exact factor combination reaching >= 60 for this record and for **TXN005**.
- **TXN005** ($75,000, `wire_transfer`, US, 10:00 UTC): `high_value` (+40) + `very_high_value` (+20) + `wire_transfer` (+10) = 70 -> `flagged_fraud`.
- **TXN004** ($500, `transfer`, `EUR`, `metadata.country: "DE"`, 02:47 UTC): `unusual_timing` (+20) + `cross_border` (+15) = 35 -> `reviewed`, not flagged.
- **TXN001**, **TXN003**, **TXN008** (all US, business hours, non-wire, under $10,000) score 0 and remain `validated`.
- **TXN007** (refund, GBP, `metadata.country: "GB"`) picks up `cross_border` (+15) at minimum and should be scored like any other validated record even though its amount was normalized upstream.

### 3. Settlement Processing Stage

Task: Settlement Processing Stage

Prompt: "Implement `pipeline/settlement.js` as a CommonJS module exporting `function processTransaction(message)`, where `message` is the envelope produced by `pipeline/fraud-detector.js`. Apply these decision rules to `message.data`: if `status === 'rejected'`, set `final_status = 'rejected'` and pass the existing `reason` through unchanged; if `status === 'flagged_fraud'`, set `final_status = 'held_for_review'` (do not settle automatically); otherwise (`'validated'` or `'reviewed'`), set `final_status = 'settled'` and stamp `settled_at` with the current ISO 8601 UTC timestamp. Return the envelope with `source_stage: 'settlement'`, `target_stage: 'results'`, `message_type: 'transaction_result'`. Log stage, transaction_id, and `final_status` via the shared logger, with no PII. The returned object must be exactly what the orchestrator persists as one JSON file per transaction under `shared/results/`."

File to CREATE: `pipeline/settlement.js`

Function to CREATE: `function processTransaction(message: object): object`

Details:
- **TXN006** (rejected for invalid currency) -> `final_status: 'rejected'`, `reason: 'invalid_currency'` preserved.
- **TXN002**, **TXN005** (`flagged_fraud`) -> `final_status: 'held_for_review'`, not settled.
- **TXN001**, **TXN003**, **TXN004**, **TXN007**, **TXN008** (`validated`/`reviewed`) -> `final_status: 'settled'` with a `settled_at` timestamp.
- Output shape must be self-contained and ready to write directly as `shared/results/<transaction_id>.json`.

### 4. Orchestrator

Task: Orchestrator

Prompt: "Implement `orchestrator.js` at the repo root as a CommonJS module using only Node's built-in `fs`/`path` (no new dependencies). On startup, ensure `shared/input/`, `shared/processing/`, `shared/output/`, `shared/results/` exist (`fs.mkdirSync(..., { recursive: true })`). Load `sample-transactions.json` from the repo root. For each of the 8 raw records: write it to `shared/input/<transaction_id>.json`; run it through `pipeline/validator.js` -> `pipeline/fraud-detector.js` -> `pipeline/settlement.js` in sequence by requiring and calling each `processTransaction` directly (not via subprocess), writing the intermediate envelope to `shared/output/<transaction_id>.json` after each stage; write the final settlement envelope to `shared/results/<transaction_id>.json`. After processing all records, write `shared/results/summary.json` containing the total count, counts per `final_status` (`settled`/`rejected`/`held_for_review`), and a list of `{ transaction_id, final_status, reason? }` entries. Export `function runPipeline()` returning the summary object, and guard CLI/stdout printing with `if (require.main === module)` so `node orchestrator.js` prints a human-readable summary (counts plus one line per rejected/held-for-review transaction with its reason). Exit code 0 even when some transactions are rejected/held; only exit non-zero on an unhandled exception."

File to CREATE: `orchestrator.js`

Function to CREATE: `function runPipeline(): object`

Details:
- Must process all 8 records from `sample-transactions.json` (`TXN001`-`TXN008`) with no unhandled errors.
- Expected `summary.json` outcome given the sample data: **TXN006** `rejected` (invalid currency `XYZ`); **TXN002** and **TXN005** `held_for_review` (flagged fraud); **TXN001**, **TXN003**, **TXN004**, **TXN007**, **TXN008** `settled`.
- `shared/input/`, `shared/processing/`, `shared/output/` end up populated with per-transaction JSON at each hand-off point, in addition to the final files in `shared/results/`.
- `runPipeline()` must be callable programmatically (for the front-end and for integration tests) independent of the CLI printing path.
