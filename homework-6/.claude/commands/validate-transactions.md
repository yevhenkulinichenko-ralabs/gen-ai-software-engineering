---
description: Validate all transactions without running the full pipeline
---

Validate every transaction in `sample-transactions.json` without running
the full pipeline. This command is read-only with respect to `shared/` —
it must not create, modify, or delete anything under `shared/input/`,
`shared/processing/`, `shared/output/`, or `shared/results/`.

Steps:

1. Run `node pipeline/validator.js --dry-run`. This reads
   `sample-transactions.json` directly and prints a summary without
   writing to `shared/`.

2. From its output, report: total count, valid count, invalid count, and
   the distinct rejection reasons seen (e.g. `invalid_currency`,
   `negative_amount_not_allowed`, `missing_required_field:<field>`,
   `invalid_amount`).

3. Render the per-transaction results as a markdown table with columns
   `transaction_id`, `status` (valid/invalid), and `reason` (blank for
   valid transactions).
