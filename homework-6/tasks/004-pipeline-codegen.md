# Step 004 — Agent 2: Implement Everything in `specification.md`

## Goal
Implement the full transaction pipeline and its front-end in one
`pipeline-codegen` pass, per `specification.md`, rather than building it
file-by-file across separate steps.

This step replaces what were previously six separate steps (validator,
fraud detector, settlement, orchestrator, research-notes finalization,
front-end). Splitting codegen that finely added coordination overhead
without adding independent value — the stages share one envelope contract
and are meant to be implemented against each other, not in isolation.

## Agent
**pipeline-codegen** (`.claude/agents/pipeline-codegen.md`) — Agent 2.
Invoke via the Agent/Task tool (`subagent_type: pipeline-codegen`).

## Prerequisites
- Step 003 complete (`specification.md` has all Low-Level Tasks).
- `mcp.json` with context7 configured (if not yet configured, configure a
  minimal context7-only entry now; a later step adds the second server).

## Deliverables
- `pipeline/validator.js`
- `pipeline/fraud-detector.js`
- `pipeline/settlement.js`
- `orchestrator.js`
- `frontend/server.js`, `frontend/public/index.html`
- `lib/logger.js` (shared PII-safe audit logger, used by all three stages)
- `research-notes.md` with >= 2 well-formed context7 query entries
- `HOWTORUN.md` gets a "Front-end" section (create the file now if it
  doesn't exist yet; a later docs step will flesh out the rest of it)

## Prompt to hand the `pipeline-codegen` subagent

```
Implement everything in specification.md's Low-Level Tasks: the
validator, fraud-detector, and settlement pipeline stages, the
orchestrator that wires them together, and the front-end. Read
specification.md in full first — do not improvise beyond it, and do not
stop after just one stage.

Use context7 before implementing each non-trivial library integration
(decimal.js, JS Date/ISO 8601 handling, Express.js), documenting every
query in research-notes.md as you go, per your own instructions.

After implementing everything, run `npm run pipeline` end-to-end and
confirm all 8 sample transactions land in shared/results/ with no
unhandled records or thrown errors, then start `node frontend/server.js`
and confirm it serves correctly, before considering the task done.

This is a from-scratch implementation — pipeline/, lib/, and
research-notes.md are currently empty/absent.
```

## Acceptance criteria
- [ ] `processTransaction` in each stage returns the correct envelope
      shape and chains correctly into the next stage
- [ ] TXN006 (currency XYZ) is rejected; TXN007 (negative amount, refund)
      is normalized and accepted; a hypothetical negative non-refund is
      rejected
- [ ] TXN002 and TXN005 end up `flagged_fraud` -> `held_for_review`;
      TXN004 accumulates both `unusual_timing` and `cross_border`
- [ ] No account numbers/names/descriptions appear in log output
- [ ] `node pipeline/validator.js --dry-run` works without touching
      `shared/`
- [ ] `node orchestrator.js` runs to completion; `shared/results/`
      contains one file per transaction plus a correct `summary.json`
- [ ] `runPipeline()` is exported and callable from other Node modules
- [ ] `node frontend/server.js` starts; `/` shows a working "Run
      Pipeline" button; after a run, the results table and summary counts
      match `shared/results/`
- [ ] `research-notes.md` has >= 2 well-formed context7 query entries,
      each naming a real file/function where the insight was applied
