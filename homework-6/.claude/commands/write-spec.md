---
description: Generate or update specification.md for a described system/feature, following specification-TEMPLATE-hint.md
argument-hint: [description of the system/feature to specify]
---

Produce a `specification.md` at the repo root for the system or feature
described below, following the structure in `specification-TEMPLATE-hint.md`
at the repo root exactly.

Target to specify: $ARGUMENTS

If this repo defines a `spec-writer` subagent (check for
`.claude/agents/spec-writer.md`), delegate this entire task to it via the
Agent/Task tool (`subagent_type: spec-writer`), passing the target
description above and the steps below as its prompt, and stop — do not
also perform the steps yourself in the main conversation. Otherwise
(no such subagent exists), perform the steps below directly.

Steps:

1. Read `specification-TEMPLATE-hint.md` at the repo root now. Use its
   section headings and Low-Level Task format exactly as written there —
   do not rely on a remembered or paraphrased version of the template,
   since edits to that file must be picked up automatically.

2. If the target description above is empty, too vague, or missing
   information you'd need to write concrete objectives, stop and ask the
   user to clarify: the high-level objective, the key requirements, and
   any existing files/data relevant to what's being specified. Do not
   guess at requirements that weren't given.

3. Inspect the current repository for relevant context before writing
   anything — README files, `package.json`/manifest files, existing
   source under the likely target directories, and any data files named
   in the target description. Ground every objective and task in what
   actually exists or was explicitly requested; do not invent
   requirements, constraints, or file names that weren't asked for or
   found in the repo.

4. Write `specification.md` with these sections, matching the template's
   headings:
   - **High-Level Objective** — one sentence describing what's being
     built.
   - **Mid-Level Objectives** — 4-5 concrete, testable requirements.
   - **Implementation Notes** — technical constraints, standards, or
     conventions relevant to the target, drawn from the description and
     repo context (not fabricated).
   - **Context** — beginning state (what exists now) and ending state
     (what should exist when done).
   - **Low-Level Tasks** — one entry per major component/module to build,
     each formatted as:
     ```
     Task: [Component Name]
     Prompt: "[Exact prompt to give an AI coding agent for this task]"
     File to CREATE: [file path]
     Function to CREATE: [function/class signature]
     Details: [what it checks, transforms, or decides]
     ```

5. Write the result to `specification.md` at the repo root, overwriting
   any previous version.

6. If `specification.md` already existed, print a short summary of what
   changed. Otherwise confirm it was created.
