# Step 002 — Agent 1 Skill: `/write-spec` (generic)

## Goal
Create a **project-agnostic** Claude Code slash command that generates a
`specification.md` for whatever system/feature the invoker describes,
following the structure in `specification-TEMPLATE-hint.md`. This is the
reusable "Plus" requirement for Agent 1 — it must work for any future
project, not just this transaction pipeline.

All content specific to *this* project (transaction pipeline stages,
`TASKS.md` requirements, `sample-transactions.json`, decimal.js, ISO 4217,
PII rules) is intentionally **not** in this step — it's supplied as the
invocation's arguments in Step 003.

## Agent
None — authoring a reusable Claude Code skill file is meta/tooling work,
not one of the four project workflow agents' jobs. Run it directly in the
main conversation.

## Prerequisites
- Step 001 complete (`.claude/commands/` exists).
- `specification-TEMPLATE-hint.md` present at the repo root.

## Deliverables
- `.claude/commands/write-spec.md`

## Prompt to run

```
Create a Claude Code slash-command skill at .claude/commands/write-spec.md.

The command must be generic and reusable for specifying any feature or
system — not hardcoded to this repo's transaction pipeline. It accepts
free-form arguments ($ARGUMENTS) describing the target system/feature to
specify.

When invoked as `/write-spec <description of what to build>`, the command
must instruct Claude to:
0. First check whether this repo defines a `spec-writer` subagent (i.e.
   `.claude/agents/spec-writer.md` exists). If it does, delegate the
   entire task to that subagent via the Agent/Task tool
   (`subagent_type: spec-writer`), passing $ARGUMENTS and the steps below
   as its prompt, and stop. This lets a project layer a
   specification-writing subagent on top of the generic skill without the
   skill itself hardcoding that subagent's existence — in a repo with no
   such subagent, fall through to steps 1-6 below.
1. Read specification-TEMPLATE-hint.md at the repo root and follow its
   structure exactly (do not hardcode/duplicate the template's sections
   inside the command file — always read the template file fresh, so
   edits to the template are picked up automatically).
2. If $ARGUMENTS is empty or too vague to act on, ask the user to
   describe: the high-level objective, key requirements, and any
   existing files/data relevant to the system to specify — before
   proceeding.
3. Inspect the current repo for relevant context (README, package.json,
   existing source files, any data files named in $ARGUMENTS) to ground
   the spec in what's actually there, rather than inventing details.
4. Produce, matching the template's exact section headings:
   - High-Level Objective (1 sentence)
   - Mid-Level Objectives (4-5 concrete, testable requirements)
   - Implementation Notes (technical constraints/standards relevant to
     what's being built, derived from $ARGUMENTS and repo context — do
     not invent constraints that weren't asked for)
   - Context (beginning state / ending state)
   - Low-Level Tasks (one entry per major component/module to build,
     each with Task/Prompt/File to CREATE/Function to CREATE/Details)
5. Write the result to specification.md at the repo root, overwriting any
   previous version.
6. Print a short summary of what changed if specification.md already
   existed.

The command file itself must not reference this project's transaction
pipeline, TASKS.md, sample-transactions.json, decimal.js, ISO 4217, or any
other project-specific detail — those only ever arrive via $ARGUMENTS at
invocation time, never hardcoded into the skill.

Keep the command file concise — it's an instruction script for Claude, not
the spec itself.
```

## Acceptance criteria
- [ ] `.claude/commands/write-spec.md` exists, reads
      `specification-TEMPLATE-hint.md`, and contains no mention of
      transactions, pipeline stages, decimal.js, or ISO 4217
- [ ] The skill accepts `$ARGUMENTS` (or prompts for a description if none
      given) to determine what to specify
- [ ] The skill checks for a `spec-writer` subagent and delegates to it
      when present, without hardcoding that subagent's project-specific
      details into the skill file itself
- [ ] The skill would work unchanged if invoked for an unrelated
      hypothetical feature in a different repo with no `spec-writer`
      subagent defined
