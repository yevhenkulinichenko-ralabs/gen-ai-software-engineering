# Step 007 — Coverage Gate Hook (Mandatory)

## Goal
Add a Claude Code hook that runs the Jest test suite with coverage and
blocks `git push` when coverage is below 80%.

## Agent
**unit-test-writer** (`.claude/agents/unit-test-writer.md`) — Agent 3, per
`TASKS.md`'s Task 3 (skills & hooks) mapping. Invoke via the Agent/Task
tool (`subagent_type: unit-test-writer`).

## Prerequisites
- Step 008 (tests) will actually make this hook meaningful, but the hook
  itself can be authored now — write this step's script defensively so it
  handles "no tests yet" without crashing, then re-verify once Step 008
  lands.

## Deliverables
- A `PreToolUse` hook in `.claude/settings.json` (or a script it calls)
- `scripts/check-coverage.js`, the script the hook runs

## Prompt to hand the `unit-test-writer` subagent

```
Add a coverage-gate hook to this Claude Code project that blocks `git
push` when test coverage is below 80%.

1. Create scripts/check-coverage.js (Node script, no extra dependencies
   beyond what's already installed):
   - Runs `npx jest --coverage --coverageReporters=json-summary
     --coverageReporters=text-summary` via child_process.spawnSync, with
     stdio: 'inherit' so output is visible
   - If Jest itself fails (non-zero exit unrelated to the threshold check
     below), exit 1 with the Jest output already surfaced by 'inherit'
   - Reads coverage/coverage-summary.json and reads .total.lines.pct (or
     .total.statements.pct — pick one and document the choice in a
     comment)
   - If that percentage < 80, print the percentage and a clear "BLOCKED:
     coverage below 80% threshold" message, then exit 1
   - Otherwise print the percentage and "coverage gate passed", exit 0

2. Wire it into .claude/settings.json as a PreToolUse hook that matches
   Bash commands containing "git push":

   {
     "hooks": {
       "PreToolUse": [
         {
           "matcher": "Bash",
           "hooks": [
             {
               "type": "command",
               "command": "node scripts/check-coverage.js"
             }
           ]
         }
       ]
     }
   }

   Constrain the matcher so the hook only fires for git push, not every
   Bash call — check the current Claude Code hooks schema for the correct
   way to match on command content (e.g. have check-coverage.js read the
   JSON payload from stdin, inspect tool_input.command, and exit 0
   immediately (no-op) if the command does not contain "git push").

3. Confirm the hook fires by attempting `git push` from a coverage state
   below 80% (temporarily, e.g. before Step 008's tests exist) and
   observing the block, then again after Step 008 raises coverage above
   80% and observing it pass. Take a screenshot of the blocked run for
   docs/screenshots/hook-trigger.png (Step 011 formalizes this).
```

## Acceptance criteria
- [x] Hook only activates on `git push`, not on unrelated Bash commands
- [x] With coverage below 80%, `git push` is blocked with a clear message
- [x] With coverage at/above 80%, `git push` proceeds (verified after
      Step 008's tests raised coverage to 94.94%)
- [x] `scripts/check-coverage.js` handles a missing/failing test run
      without crashing the hook itself
