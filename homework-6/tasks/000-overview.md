# Homework 6 Capstone — Implementation Plan

This folder breaks `TASKS.md` into an ordered sequence of steps. Each `XXX-*.md`
file is self-contained: it states the goal, the deliverables, and the exact
prompt(s) to hand to Claude Code (or another coding agent) to produce that
step's output. Run them in order — later steps assume earlier files exist.

## Chosen stack (fixed so every step stays consistent)

- **Language/runtime**: Node.js 20+, plain JavaScript (CommonJS, `require`/
  `module.exports` — no TypeScript build step)
- **Backend/pipeline**: Express.js for the front-end server and API; plain
  Node modules (no framework needed) for the pipeline stages themselves
- **Pipeline**: file-based JSON messages under `shared/`, stages wired
  together by `orchestrator.js`
- **Monetary values**: `decimal.js` npm package (never native `Number`/float
  math for amounts)
- **Front-end**: Express serving a static `frontend/public/index.html` +
  a small JSON API over `shared/results/`
- **Tests**: Jest (`jest --coverage`, Istanbul coverage under the hood)
- **MCP**: `@modelcontextprotocol/sdk`'s `McpServer` high-level API (the
  JS/TS equivalent of Python's FastMCP ergonomics) for the custom server,
  `@upstash/context7-mcp` for the context7 server
- **Coverage gate**: a Claude Code `PreToolUse` hook on `git push` that
  runs `npx jest --coverage --coverageReporters=json-summary` and blocks
  the push below 80%

## Subagents

Four project-scoped Claude Code subagents live in `.claude/agents/`, one
per workflow agent — these files (not a root-level `agents.md`) are the
definition of the four-agent workflow for this project. Steps below invoke
the matching subagent via the Agent/Task tool (`subagent_type: <name>`)
instead of running prompts inline, so each phase of work stays
attributable to the agent responsible for it:

| Subagent | File | Workflow agent |
|---|---|---|
| `spec-writer` | `.claude/agents/spec-writer.md` | Agent 1 — Specification |
| `pipeline-codegen` | `.claude/agents/pipeline-codegen.md` | Agent 2 — Code Generation |
| `unit-test-writer` | `.claude/agents/unit-test-writer.md` | Agent 3 — Unit Tests (+ Task 3 skills/hooks, per `TASKS.md`) |
| `docs-writer` | `.claude/agents/docs-writer.md` | Agent 4 — Documentation |

Steps 001, 002, and 016 have no subagent — they're bootstrapping/meta work
or require a human to actually take a screenshot.

## Step order

| # | File | Produces | Maps to TASKS.md | Subagent |
|---|------|----------|-------------------|----------|
| 001 | `001-project-scaffold-and-subagents.md` | Repo skeleton, `package.json`, four `.claude/agents/*.md` subagents | Task 1 | — |
| 002 | `002-write-spec-skill.md` | `.claude/commands/write-spec.md` (generic, project-agnostic skill) | Task 1 | — |
| 003 | `003-specification-md.md` | `specification.md` (invokes `/write-spec` with this project's specifics) | Task 1 | `spec-writer` |
| 004 | `004-pipeline-codegen.md` | `pipeline/validator.js`, `pipeline/fraud-detector.js`, `pipeline/settlement.js`, `orchestrator.js`, `frontend/` (Express app), `research-notes.md` | Task 2 (all 3 stages + front-end) | `pipeline-codegen` |
| 005 | `005-custom-mcp-server.md` | `mcp/server.js`, `mcp.json` | Task 4 | `pipeline-codegen` |
| 006 | `006-skills-run-pipeline-and-validate-transactions.md` | `.claude/commands/run-pipeline.md`, `.claude/commands/validate-transactions.md` | Task 3 | `unit-test-writer` |
| 007 | `007-coverage-gate-hook.md` | `.claude/settings.json` hook | Task 3 | `unit-test-writer` |
| 008 | `008-tests-suite.md` | `tests/` (Jest) | Task 5 | `unit-test-writer` |
| 009 | `009-readme-and-howtorun.md` | `README.md`, `HOWTORUN.md` | Task 5 | `docs-writer` |
| 010 | `010-presentation-pdf.md` | `docs/presentation.pdf` | Task 5 | `docs-writer` |
| 011 | `011-screenshots.md` | `docs/screenshots/*.png` | Task 3 / 4 / 5 | — (manual) |
| 012 | `012-pr-description-and-submission.md` | PR description, final checklist pass | Submission | `docs-writer` |

Step 004 deliberately covers everything in `specification.md`'s Low-Level
Tasks (all three pipeline stages + orchestrator) plus the front-end in one
`pipeline-codegen` invocation, rather than one step per file — the stages
share a single envelope contract and are built/verified against each
other, so splitting them into isolated steps (as an earlier version of
this plan did) added step-tracking overhead without adding independent
value. `research-notes.md`'s context7 entries are produced inline as part
of this same step instead of a separate finalization pass.

## Notes on missing inputs

`specification-TEMPLATE-hint.md` is now present at the repo root (copied
from `homework-3/specification-TEMPLATE-example.md`, since no file with
that exact name exists elsewhere in the course repo). Step `002`'s
`/write-spec` skill reads this file rather than embedding the template
inline.

`TASKS.md` lists a root-level `agents.md` as a Task 1 deliverable. This
plan deliberately implements that requirement as the four
`.claude/agents/*.md` subagent definitions instead of a separate
documentation file — each subagent file *is* that agent's specification
(role, inputs, outputs, constraints), so a standalone `agents.md` would
just duplicate them. Flag this substitution explicitly in Step 012's PR
description so a reviewer checking `TASKS.md`'s literal checklist item
knows where the equivalent content lives.

`TASKS.md`'s examples (`mcp/server.py`, `python orchestrator.py`, `decimal.Decimal`)
are illustrative — the assignment is explicitly language-agnostic and calls
out `node mcp/server.js` as the Node equivalent. Every step below uses the
Node.js/Express/JavaScript equivalents throughout.
