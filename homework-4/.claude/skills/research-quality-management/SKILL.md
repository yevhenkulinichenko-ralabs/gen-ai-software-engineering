---
name: research-quality-management
description: Analyse bug reports written as Markdown files and evaluate their research quality. Use this skill whenever the user asks to review, analyse, audit, check, or assess bug reports, research findings, or investigation notes — even if they just say "check my bug report", "review these findings", or "how good is this report". If a bug report or research document is involved, this skill applies. Produces a structured analysis per report covering: Summary (pass/fail per quality criterion), Verified Claims, Discrepancies Found, Research Quality Assessment (High/Medium/Low with reasoning), and References.
---

# Research Quality Management

You are evaluating the quality of bug reports written as Markdown files. For each report, produce a structured analysis covering five sections.

## Quality Criteria

Score each criterion independently as **Pass** or **Fail**, then combine into an overall **High / Medium / Low** rating.

| Criterion | What to check |
|---|---|
| **Root Cause Analysis** | Does the report identify a specific, plausible root cause — not just symptoms? Is the cause traceable to actual code behaviour? |
| **Reproducibility** | Are the steps to reproduce clear, ordered, and complete enough to follow without guessing? |
| **Impact Assessment** | Is severity/scope stated and justified (users affected, data at risk, frequency, business impact)? |
| **Evidence Quality** | Are claims backed by code references, file paths, line numbers, logs, stack traces, or other concrete evidence? |
| **Internal Consistency** | Do the symptoms, root cause, and proposed fix align with each other? Are there contradictions within the report itself? |

**Overall quality scoring:**
- **High** — 4–5 criteria pass
- **Medium** — 2–3 criteria pass
- **Low** — 0–1 criteria pass

## Verification Process

Read the full bug report before starting. For each factual claim (e.g. "function X does Y", "file Z contains bug", "line N causes this"):

1. **Codebase check** — Use Grep and Read to locate the relevant code. Confirm whether the claim matches what the code actually does. If the named file or function doesn't exist, that is itself a significant finding.
2. **Internal consistency check** — Do the symptoms described follow logically from the stated root cause? Does the proposed fix actually address that root cause? Are there any contradictions between sections of the report?

Classify each claim as:
- ✅ **Verified** — code evidence confirms the claim
- ❌ **Contradicted** — code evidence conflicts with the claim
- ⚠️ **Unverified** — no code evidence found either way (treat as neutral, not as confirmation)

Prioritise verifying the root cause claim above all others — it is the most critical part of any bug report.

## Output Format

Use this exact template for each bug report analysed:

---

# Bug Report Analysis: `<filename>`

## Summary

| Criterion | Result |
|---|---|
| Root Cause Analysis | ✅ Pass / ❌ Fail |
| Reproducibility | ✅ Pass / ❌ Fail |
| Impact Assessment | ✅ Pass / ❌ Fail |
| Evidence Quality | ✅ Pass / ❌ Fail |
| Internal Consistency | ✅ Pass / ❌ Fail |
| **Overall Research Quality** | **High / Medium / Low** |

## Verified Claims

- ✅ **Verified**: "[exact claim from report]" — `path/to/file.ts:42` confirms this.
- ❌ **Contradicted**: "[exact claim from report]" — `path/to/file.ts:17` shows X instead of Y.
- ⚠️ **Unverified**: "[exact claim from report]" — no code evidence found to confirm or deny.

## Discrepancies Found

Describe contradictions between the report's claims and the actual codebase, or internal inconsistencies within the report. Be specific — quote the conflicting statements. If none, write "None found."

## Research Quality Assessment

**Level:** High / Medium / Low

**Reasoning:** [2–4 sentences. Reference specific criteria that passed or failed and why. Call out any contradicted or unverified claims that meaningfully affected the score. Be direct — avoid vague praise or criticism.]

## References

All code locations examined during verification:

- `path/to/file.ts:42` — [what was checked here]
- `path/to/file.ts:17` — [what was checked here]

---

## Analysing multiple reports

If the user provides multiple bug reports, analyse each one separately with the template above. Then append a **Combined Summary** table at the end:

| Report | Root Cause | Reproducibility | Impact | Evidence | Consistency | Overall |
|---|---|---|---|---|---|---|
| `bug-1.md` | ✅ | ✅ | ❌ | ✅ | ✅ | High |
| `bug-2.md` | ❌ | ❌ | ❌ | ❌ | ✅ | Low |

## Important notes

- Read the full report before evaluating — context in one section often affects scoring of another.
- If a claim cannot be verified against the codebase, mark it Unverified rather than assuming it is correct.
- If the named file, function, or line doesn't exist in the codebase, flag it explicitly — that is a significant discrepancy.
- Avoid hedging on the overall quality level. Commit to High, Medium, or Low and justify it clearly.
