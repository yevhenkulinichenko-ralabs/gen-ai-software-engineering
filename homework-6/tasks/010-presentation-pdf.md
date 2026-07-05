# Step 010 — Agent 4: Presentation PDF

## Goal
Produce a capstone presentation (architecture, stages, demo, lessons
learned) committed as `docs/presentation.pdf`.

## Agent
**docs-writer** (`.claude/agents/docs-writer.md`) — Agent 4. Invoke via
the Agent/Task tool (`subagent_type: docs-writer`).

## Prerequisites
- Steps 001-009 complete (there's a finished project to present).

## Deliverables
- `docs/presentation.pdf`
- `docs/presentation.md` (source, kept for editability)

## Prompt to hand the `docs-writer` subagent

```
Write a slide deck for this capstone project as docs/presentation.md
using Marp-flavored markdown (--- separates slides, front-matter sets
theme). Cover, in order:
1. Title slide: project name, "Created by <Your Name>", date
2. Problem/objective: one sentence high-level objective from
   specification.md
3. Architecture: reproduce the ASCII diagram from README.md as a slide
   (Node.js/Express + MCP server around the pipeline core)
4. Pipeline stages: one slide per stage (validator, fraud detector,
   settlement) with its responsibility and one concrete example from
   sample-transactions.json
5. The four-agent workflow: how specification/code-gen/tests/docs agents
   were used, referencing the `.claude/agents/*.md` subagent definitions
6. MCP integration: context7 usage (one example query from
   research-notes.md) and the custom pipeline-status server's tools
   (built on @modelcontextprotocol/sdk)
7. Skills & hooks: /run-pipeline, /validate-transactions, and the
   coverage gate hook blocking a sub-80% push
8. Demo: screenshot placeholders for the Express front-end and a pipeline
   run (reference docs/screenshots/ filenames from Step 011)
9. Test coverage: final Jest coverage percentage achieved
10. Lessons learned: 3-4 concrete takeaways from building this pipeline

Then render docs/presentation.md to docs/presentation.pdf. Use whichever
of these is available in this environment, in order of preference:
1. `marp docs/presentation.md -o docs/presentation.pdf` (Marp CLI, e.g.
   via `npx @marp-team/marp-cli`)
2. `pandoc docs/presentation.md -o docs/presentation.pdf` (if a PDF
   engine like wkhtmltopdf/tectonic is available)
3. If neither tool is available, tell me what's missing and what you'd
   need installed rather than fabricating a PDF another way.

Confirm docs/presentation.pdf opens and shows real content (page count
matches slide count) before finishing.
```

## Acceptance criteria
- [x] `docs/presentation.pdf` exists, opens, and matches the outline above
      (12 pages: 10 outline items, with the "pipeline stages" item split
      across 3 slides as intended)
- [x] Deck includes the author's name
- [x] Deck references real artifacts from this repo (no placeholder text,
      except explicitly-labeled "pending" screenshot slots for Step 011)
