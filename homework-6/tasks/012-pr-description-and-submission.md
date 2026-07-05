# Step 012 — PR Description & Submission Checklist

## Goal
Write the pull request description and do a final self-check against
`TASKS.md`'s Deliverables Checklist and Success Criteria before opening
the PR.

## Agent
**docs-writer** (`.claude/agents/docs-writer.md`) — Agent 4, since a PR
description is documentation. Invoke via the Agent/Task tool
(`subagent_type: docs-writer`) for drafting; the final checklist
walkthrough and PR opening itself should stay in the main conversation so
the user can review before anything is pushed (see this repo's
confirm-before-pushing norm in the acceptance criteria below).

## Prerequisites
- Steps 001-011 complete.

## Deliverables
- PR description (to paste when opening the PR)
- A completed pass through `TASKS.md`'s checklist (fix anything missing
  before proceeding)

## Prompt to hand the `docs-writer` subagent

```
Before drafting the PR description, walk through TASKS.md's "Deliverables
Checklist" and "Success Criteria" tables item by item against the actual
repo state (check files exist, run `npm run pipeline`, run `npx jest
--coverage`, invoke the skills) and report any gaps. Fix any gaps you
find.

Once everything checks out, draft a PR description with these sections:
1. Summary — what the pipeline does, the 3 stages, the four-agent
   workflow used to build it, and the Node.js/Express/Jest stack
2. Specification — link to specification.md, one-line summary of the
   high-level objective
3. Pipeline run — embed/link docs/screenshots/pipeline-run.png, describe
   the sample-transactions.json outcome (counts by status)
4. Front-end demo — embed/link docs/screenshots/frontend.png
5. Tests & coverage — final Jest coverage %, embed/link
   docs/screenshots/test-coverage.png
6. Skill & hook in action — embed/link
   docs/screenshots/skill-run-pipeline.png and
   docs/screenshots/hook-trigger.png, one sentence on what the hook
   blocks
7. MCP usage — embed/link docs/screenshots/mcp-interaction.png,
   reference research-notes.md's context7 queries and the custom
   pipeline-status server's tools (built on @modelcontextprotocol/sdk)
8. Documentation — link README.md (note it includes the author's name)
   and HOWTORUN.md
9. Presentation — link/embed docs/presentation.pdf
10. Challenges & how they were addressed — 2-3 real ones from this build
11. How to review — the exact commands a reviewer runs to verify
    everything (`npm install`, `npm run pipeline`, `npm test`,
    `npm run frontend`, `npm run mcp`)

Do not submit this yet — present the draft PR description to me for
review first.
```

## Acceptance criteria
- [x] Every item in `TASKS.md`'s Deliverables Checklist is checked off
      for real (not assumed)
- [x] Every item in `TASKS.md`'s Success Criteria table is ✅
- [x] PR description embeds/links all 6 screenshots and the presentation
      PDF, and includes the author's name via the README link
- [ ] PR description is reviewed by the user before the PR is opened
      (per this repo's "always confirm before pushing/opening PRs" norm) —
      awaiting review now
