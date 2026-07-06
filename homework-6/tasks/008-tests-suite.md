# Step 008 — Agent 4: Test Suite

## Goal
Write unit tests for each pipeline stage plus an integration test for the
full pipeline, isolated from the real `shared/` directories, targeting
>= 90% coverage (gate is 80%).

## Agent
**unit-test-writer** (`.claude/agents/unit-test-writer.md`) — Agent 3.
Invoke via the Agent/Task tool (`subagent_type: unit-test-writer`).

## Prerequisites
- Step 004 complete (all stages + orchestrator exist).

## Deliverables
- `tests/validator.test.js`
- `tests/fraud-detector.test.js`
- `tests/settlement.test.js`
- `tests/orchestrator.integration.test.js`
- `jest.config.js` (or a `jest` key in `package.json`)

## Prompt to hand the `unit-test-writer` subagent

```
Write a Jest test suite under tests/ for this transaction processing
pipeline. Do not touch the real shared/ directory from any test — use
Node's fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-test-')) to create
an isolated temp directory per test/suite, and pass a base directory
parameter into orchestrator.js (refactor runPipeline(baseDir) to accept an
optional base directory, defaulting to the repo's shared/, so tests can
point it elsewhere — check how paths are currently resolved in
orchestrator.js before deciding the cleanest way to inject this).

Create a small shared fixtures module (tests/fixtures.js) exporting a
handful of representative transaction objects covering: valid transfer,
invalid currency, negative non-refund amount, high-value wire transfer,
cross-border unusual-hour transfer, valid refund.

tests/validator.test.js:
- Valid transaction passes with status "validated"
- Missing required field is rejected with a reason
- Invalid currency (e.g. "XYZ") is rejected
- Non-numeric amount is rejected
- Negative amount + transaction_type "refund" is accepted
- Negative amount + non-refund type is rejected
- --dry-run mode (test the underlying reusable function directly, not by
  spawning a subprocess) reports correct valid/invalid counts against a
  small fixture array, not the real sample-transactions.json (so the test
  doesn't depend on that file's contents changing later)

tests/fraud-detector.test.js:
- Rejected input passes through unscored
- Amount > 10000 adds high_value risk factor
- Amount > 50000 adds the additional very_high_value factor
- Cross-border (country !== "US") adds cross_border factor
- Timestamp between 00:00-06:00 UTC adds unusual_timing factor
- Combined factors push a transaction to flagged_fraud at the >= 60
  threshold; a single small factor stays below flagged

tests/settlement.test.js:
- Rejected input stays rejected
- flagged_fraud input becomes held_for_review
- Clean input becomes settled with a settled_at timestamp

tests/orchestrator.integration.test.js:
- Given a small array of 3-4 fixture transactions (valid/invalid/
  high-risk) written to a tmp input file, call runPipeline() against a
  tmp base directory and assert:
  - every transaction produces a result file
  - summary.json counts match expectations
  - no exception is thrown

Then run:
  npx jest --coverage
and iterate on any coverage gaps in branches you haven't hit until total
coverage is >= 90%. Report the final coverage percentage.
```

## Acceptance criteria
- [x] Every test passes in isolation (no dependency on `shared/` state
      left over from a previous run)
- [x] No test writes to the real `shared/` directories
- [x] `npx jest --coverage` reports >= 90% (94.94% lines)
- [x] Re-running `scripts/check-coverage.js` from Step 007 now passes
