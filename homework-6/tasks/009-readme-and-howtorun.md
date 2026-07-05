# Step 009 — Agent 4: `README.md` and `HOWTORUN.md`

## Goal
Produce the final documentation, crediting the author by name as required.

## Agent
**docs-writer** (`.claude/agents/docs-writer.md`) — Agent 4. Invoke via
the Agent/Task tool (`subagent_type: docs-writer`).

## Prerequisites
- Steps 001-008 complete (there's a real system to document).

## Deliverables
- `README.md`
- `HOWTORUN.md` (finalized — Step 004 already started a front-end section)

## Prompt to hand the `docs-writer` subagent

```
Write README.md and finalize HOWTORUN.md for this project.

README.md must include:
- A "Created by <Your Name>" line near the top (ask me for my name if you
  don't already know it from git config user.name — do not invent a
  placeholder)
- 1-2 paragraphs describing what the pipeline does (validation -> fraud
  detection -> settlement, file-based message passing, results queryable
  via an Express front-end and an MCP server)
- One bullet per pipeline stage describing its responsibility (validator,
  fraud-detector, settlement) plus the orchestrator's role
- An ASCII architecture diagram showing:
  sample-transactions.json -> orchestrator.js -> [validator] -> [fraud
  detector] -> [settlement] -> shared/results/ -> {Express frontend, MCP
  server}
- A tech stack table: Node.js version, Express, decimal.js, Jest,
  @modelcontextprotocol/sdk, hooks
- Links to specification.md, HOWTORUN.md, research-notes.md, and the
  `.claude/agents/` subagent definitions (the four-agent workflow)

HOWTORUN.md must have numbered steps covering, in order:
1. Environment setup (Node.js version, `npm install`)
2. Running the pipeline (`node orchestrator.js` / `npm run pipeline`
   and/or `/run-pipeline`)
3. Running the front-end (`node frontend/server.js` / `npm run frontend`,
   URL to open)
4. Running the custom MCP server (`node mcp/server.js` / `npm run mcp`)
   and how to point a client at mcp.json
5. Running tests and checking coverage (`npx jest --coverage`)
6. Using the two custom skills (`/run-pipeline`, `/validate-transactions`)
7. Where to find results (shared/results/, the front-end, the MCP tools)

Keep both files accurate to what actually exists in the repo right now —
verify each command/path you document actually works before writing it
down.
```

## Acceptance criteria
- [x] `README.md` includes the author's real name, not a placeholder
- [x] ASCII diagram accurately reflects the actual pipeline flow
- [x] Tech stack table matches `package.json`
- [x] `HOWTORUN.md` steps are copy-pasteable and actually work end to end
