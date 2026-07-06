# Step 006 — Agent 3 Skills: `/run-pipeline` and `/validate-transactions`

## Goal
Turn the two most common developer actions into first-class Claude Code
slash commands.

## Agent
**Main agent** — run directly in the main conversation, not delegated to a
subagent. `TASKS.md` assigns Task 3 (skills & hooks) to the unit-test
agent conceptually, but authoring these two skill files is simple enough
to perform directly.

## Prerequisites
- Step 004 complete (`orchestrator.js` and
  `node pipeline/validator.js --dry-run` both exist).

## Deliverables
- `.claude/commands/run-pipeline.md`
- `.claude/commands/validate-transactions.md`

## Steps for the main agent to perform directly

```
Create two Claude Code slash-command skills.

.claude/commands/run-pipeline.md — runs the full pipeline end-to-end.
Steps for the command to follow when invoked:
1. Check that sample-transactions.json exists at the repo root; stop with
   a clear message if not.
2. Clear shared/input/, shared/processing/, shared/output/,
   shared/results/ (delete their contents, keep the directories).
3. Run `node orchestrator.js` and capture its output.
4. Read shared/results/summary.json and print a summary table: total,
   settled, rejected, held_for_review.
5. For every rejected or held_for_review transaction, print its
   transaction_id and reason.

.claude/commands/validate-transactions.md — validates without running the
full pipeline. Steps for the command to follow when invoked:
1. Run `node pipeline/validator.js --dry-run`.
2. Report: total count, valid count, invalid count, and the distinct
   rejection reasons seen.
3. Render the per-transaction results as a markdown table (transaction_id,
   valid/invalid, reason if invalid).

Write both as instruction-style markdown (imperative steps for Claude to
execute via Bash), matching the two examples already sketched in
TASKS.md's Task 3 section.
```

## Acceptance criteria
- [x] `/run-pipeline` clears `shared/`, runs the orchestrator, and reports
      a summary with rejection/hold reasons
- [x] `/validate-transactions` runs the validator in dry-run mode only —
      it must not write to `shared/`
- [x] Both commands produce readable, tabular output
