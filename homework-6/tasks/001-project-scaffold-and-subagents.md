# Step 001 — Project Scaffold & Subagents

## Goal
Stand up the repo skeleton (directories, `.gitignore`, `package.json`) and
create the four project-specific Claude Code subagents under
`.claude/agents/` — one per workflow role (spec, code generation, unit
tests, docs) — before any pipeline code exists.

## Agent
None — this step creates the four subagents (`spec-writer`,
`pipeline-codegen`, `unit-test-writer`, `docs-writer`); they don't exist
yet to invoke. Run it directly in the main conversation.

## Prerequisites
- `TASKS.md` and `sample-transactions.json` already present (they are).

## Deliverables
- `shared/{input,processing,output,results}/` (with `.gitkeep` files)
- `pipeline/`, `frontend/`, `mcp/`, `tests/`, `docs/screenshots/`, `.claude/commands/`
- `package.json` with dependencies and npm scripts
- `.gitignore` (node_modules, coverage artifacts, `shared/processing/*`)
- `.claude/agents/spec-writer.md`
- `.claude/agents/pipeline-codegen.md`
- `.claude/agents/unit-test-writer.md`
- `.claude/agents/docs-writer.md`

## Prompt to run

```
Scaffold a Node.js transaction-processing pipeline project in this
directory (homework-6). Do not write pipeline logic yet — just structure.

1. Create these directories with a `.gitkeep` placeholder where they'd
   otherwise be empty:
   shared/input/, shared/processing/, shared/output/, shared/results/,
   pipeline/, frontend/public/, mcp/, tests/, docs/screenshots/,
   .claude/commands/
2. Run `npm init -y` and then edit package.json to set:
   - "type": "commonjs"
   - scripts: "pipeline": "node orchestrator.js",
     "frontend": "node frontend/server.js",
     "test": "jest --coverage",
     "mcp": "node mcp/server.js"
3. Add dependencies via npm install: express, decimal.js,
   @modelcontextprotocol/sdk, uuid
   Add devDependencies via npm install -D: jest, supertest
   (Check current package names/APIs via context7 first if unsure —
   @modelcontextprotocol/sdk's API has changed across versions.)
4. Create a `.gitignore` covering: node_modules/, coverage/,
   shared/processing/*, shared/output/*, .env. Keep `.gitkeep` files even
   though the directories they're in are otherwise ignored.
5. Create four Claude Code subagent definitions under `.claude/agents/`,
   each a markdown file with YAML frontmatter (`name`, `description`,
   `tools`, `model`) followed by a system prompt body. These are the
   project's four workflow agents — give each a project-specific system
   prompt (not generic boilerplate) covering its role, inputs, outputs,
   and constraints for a transaction-processing pipeline:

   - `.claude/agents/spec-writer.md` (Agent 1 — Specification)
     - Tools: Read, Grep, Glob, Write
     - Role: produces `specification.md` for the transaction pipeline,
       reading `TASKS.md` (assignment requirements) and
       `sample-transactions.json` (real data shape) before writing.
     - Outputs: `specification.md` with High-Level Objective, Mid-Level
       Objectives, Implementation Notes, Context, Low-Level Tasks per
       stage.

   - `.claude/agents/pipeline-codegen.md` (Agent 2 — Code Generation)
     - Tools: Read, Grep, Glob, Write, Edit, Bash
     - Role: implements `orchestrator.js` + pipeline stages (validator,
       fraud detector, settlement) and the Express front-end, per
       `specification.md`.
     - Tooling: MCP context7 for framework/library lookups during
       implementation (decimal.js, Express, the MCP SDK) — document
       queries in `research-notes.md`.
     - Include the standard file-based pipeline message envelope (from
       TASKS.md's file-based pipeline protocol section: message_id,
       timestamp, source_stage, target_stage, message_type, data) and the
       `shared/{input,processing,output,results}/` directory roles
       directly in this subagent's body, so it's self-contained.
     - Outputs: orchestrator.js, pipeline/*.js, frontend/, research-notes.md

   - `.claude/agents/unit-test-writer.md` (Agent 3 — Unit Tests)
     - Tools: Read, Grep, Glob, Write, Edit, Bash
     - Role: writes tests/ (Jest) covering each stage + integration path;
       also owns Task 3's skills/hooks work (`/run-pipeline`,
       `/validate-transactions`, coverage-gate hook), per TASKS.md's
       agent-to-task mapping.
     - Constraint: coverage gate hook blocks `git push` below 80%.
     - Outputs: tests/*.test.js, coverage report.

   - `.claude/agents/docs-writer.md` (Agent 4 — Documentation)
     - Tools: Read, Grep, Glob, Write, Edit, Bash
     - Role: generates README.md, HOWTORUN.md, docs/presentation.pdf.
     - Constraint: README must credit the author by name.

Do not implement any pipeline stage logic in this step — scaffolding only.
```

## Acceptance criteria
- [ ] All directories exist; `shared/` subfolders are empty but tracked
- [ ] `package.json` has the four npm scripts and the listed dependencies
- [ ] All four `.claude/agents/*.md` subagents exist with project-specific
      roles, inputs, outputs, and constraints (not generic boilerplate)
- [ ] Nothing under `pipeline/`, `frontend/`, `mcp/` contains real logic yet
