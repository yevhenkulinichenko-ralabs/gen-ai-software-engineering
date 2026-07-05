---
description: Run the transaction processing pipeline end-to-end and report results
---

Run the transaction processing pipeline end-to-end and report a summary of
what happened.

Steps:

1. Check that `sample-transactions.json` exists at the repo root. If it
   does not, stop and tell the user clearly that the pipeline cannot run
   without it.

2. Clear `shared/input/`, `shared/processing/`, `shared/output/`, and
   `shared/results/` — delete their contents but keep the directories
   themselves (so the pipeline has somewhere to write).

3. Run `node orchestrator.js` and capture its output. Show the user any
   errors it prints.

4. Read `shared/results/summary.json` and print a summary table with:
   `total`, `settled`, `rejected`, `held_for_review`.

5. For every transaction in `summary.json` whose `final_status` is
   `rejected` or `held_for_review`, print its `transaction_id` and
   `reason` (look up the full record in `shared/results/` if `reason` is
   not already present on the summary entry).

Render the summary and the rejection/hold list as markdown tables so the
output is easy to scan.
