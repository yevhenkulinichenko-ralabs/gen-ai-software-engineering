# Step 003 — Generate `specification.md` for the Transaction Pipeline

## Goal
Invoke the generic `/write-spec` skill with this project's specifics to
produce the actual `specification.md`, before any pipeline code is
written. This step holds all the transaction-pipeline-specific content
that step 002's skill deliberately does not know about.

## Agent
**spec-writer** (`.claude/agents/spec-writer.md`) — Agent 1. As of step
002, `/write-spec` itself checks for this subagent and delegates to it
automatically (`subagent_type: spec-writer`) — just run `/write-spec`
below directly; there's no need to invoke the subagent by hand.

## Prerequisites
- Step 001 complete (`.claude/agents/spec-writer.md` exists).
- Step 002 complete (`/write-spec` skill exists, is generic, and
  delegates to a `spec-writer` subagent when one is defined).

## Deliverables
- `specification.md` at repo root, with all 5 required sections and one
  Low-Level Task per pipeline stage (validator, fraud detector, third
  stage, orchestrator).

## Prompt to run

```
/write-spec Build a Node.js/Express transaction processing pipeline for
this repo. Before writing anything, read TASKS.md at the repo root for the
full assignment requirements, and sample-transactions.json for the real
data shape (8 transactions, currencies USD/EUR/GBP/XYZ, one invalid
currency XYZ, one negative refund amount).

Pipeline stages, in order:
1. Validation — required fields present, amount is a valid positive
   decimal.js Decimal (except refunds, which are negative by convention in
   the sample data and should be normalized/flagged, not rejected outright
   — decide and document the rule), currency is a valid ISO 4217 code.
2. Fraud Detection — risk score based on: amount > $10,000 (high value),
   transaction timestamp outside business hours (00:00-06:00 UTC),
   cross-border transactions (metadata.country differs from an assumed
   home country "US"), wire_transfer type as a risk multiplier.
3. Settlement Processing — for transactions that pass validation and are
   not flagged as high-risk fraud, mark as settled and write a final
   record to shared/results/.
4. Orchestrator — loads sample-transactions.json, drops records into
   shared/input/, runs the three stages in sequence via the file-based
   protocol, and produces a summary report.

Implementation Notes to include: monetary values use the decimal.js
library (never native Number/float math), currency codes validated
against ISO 4217, audit logging with timestamp/stage name/transaction
ID/outcome, and no plaintext logging of account numbers or names (PII).

Low-Level Tasks: one per stage (validator, fraud detector, settlement,
orchestrator), each with File to CREATE as pipeline/<stage>.js (or
orchestrator.js at the repo root) and Function to CREATE as the exported
function signature (e.g. processTransaction(record) for the stages,
runPipeline() for the orchestrator).

Use the real records in sample-transactions.json as the concrete basis for
Mid-Level Objectives and stage details — for example TXN006 (currency
XYZ) should be a validation-rejection example, and TXN002/TXN005
(>$10,000) should be fraud-review examples.
```

## Acceptance criteria
- [ ] `specification.md` has all 5 sections: High-Level Objective,
      Mid-Level Objectives (4-5), Implementation Notes, Context, Low-Level
      Tasks
- [ ] Low-Level Tasks section has one entry per stage (>= 4 entries:
      validator, fraud detector, settlement/third stage, orchestrator)
      each with Task/Prompt/File to CREATE/Function to CREATE/Details,
      referencing `.js` files
- [ ] Mid-Level Objectives are concrete and testable, referencing the
      actual sample data where useful
- [ ] decimal.js, ISO 4217, audit logging, and PII rules appear in
      Implementation Notes
