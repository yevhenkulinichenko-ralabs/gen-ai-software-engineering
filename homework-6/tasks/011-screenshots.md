# Step 011 — Screenshots

## Goal
Capture the 6 required screenshots documenting each major workflow piece.

## Agent
None — screenshot capture requires a human (or a screenshot tool) actually
clicking/taking the picture; no subagent can do this. Run it directly in
the main conversation, guiding the user step by step as written below.

## Prerequisites
- Steps 004, 006, 007, 008 complete (there's something real to screenshot
  for each item).

## Deliverables
- `docs/screenshots/pipeline-run.png`
- `docs/screenshots/frontend.png`
- `docs/screenshots/test-coverage.png`
- `docs/screenshots/skill-run-pipeline.png`
- `docs/screenshots/hook-trigger.png`
- `docs/screenshots/mcp-interaction.png`

## Prompt to run

```
This step is manual capture guided by you (Claude), since screenshots
require a human or a screenshot tool to actually take them. For each item
below, tell me exactly what command to run or what to click, wait for me
to confirm the screenshot is saved, then move to the next:

1. docs/screenshots/pipeline-run.png
   Run `node orchestrator.js` (or `/run-pipeline`) and screenshot the
   full terminal output.

2. docs/screenshots/frontend.png
   Start `node frontend/server.js`, open it in a browser, trigger a run,
   and screenshot the results table with status counts visible.

3. docs/screenshots/test-coverage.png
   Run `npx jest --coverage` and screenshot the coverage table (must show
   >= 80%, ideally >= 90%).

4. docs/screenshots/skill-run-pipeline.png
   Invoke `/run-pipeline` in Claude Code and screenshot it executing.

5. docs/screenshots/hook-trigger.png
   Trigger the coverage gate hook firing — ideally show it actually
   blocking a `git push` when coverage was intentionally below 80% (or,
   if coverage is already >= 80% by this point, temporarily comment out a
   test file to drop coverage, attempt the push, screenshot the block,
   then restore the test file).

6. docs/screenshots/mcp-interaction.png
   Screenshot both: a context7 query result during development, and a
   call to a custom MCP tool (get_transaction_status or
   list_pipeline_results) returning real data. Two screenshots stitched
   or a single screen showing both is fine.

After each is saved, verify the file exists at the expected path and is a
real image (non-zero size) before continuing.
```

## Acceptance criteria
- [x] All 6 files exist under `docs/screenshots/` with non-zero size
- [x] Each screenshot shows real output, not a mockup
- [x] `hook-trigger.png` specifically shows a block/failure, not a pass
      (also surfaced and fixed a real bug: `scripts/check-coverage.js` was
      using `exit(1)`, which doesn't block a Claude Code PreToolUse hook —
      only `exit(2)` does; fixed and re-verified the block)
