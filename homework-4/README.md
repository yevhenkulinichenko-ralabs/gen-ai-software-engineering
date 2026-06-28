# Homework 4 — Agent-Driven Bug Research & Fix Workflow

> **Student Name**: Yevhen Kulinichenko AAI02
> **Date Submitted**: 28.06.2026
> **AI Tools Used**: Claude Code

A **Todo REST API** (Express.js) paired with a full, automated quality-assurance pipeline powered by six custom Claude agents and two reusable skills.

---

## Application

**`src/app.js`** — an in-memory Todo REST API with:

| Endpoint | Description |
|---|---|
| `POST /auth/register` | Register a new user (bcrypt-hashed password) |
| `POST /auth/login` | Login and receive a JWT token |
| `GET /todos` | List the authenticated user's todos |
| `POST /todos` | Create a todo (max 100 per user) |
| `PUT /todos/:id` | Update a todo (owner only) |
| `DELETE /todos/:id` | Delete a todo (owner only) |

**Stack**: Express 4, jsonwebtoken 9, bcrypt 5, Jest 29, supertest 6.

---

## Automated Workflow

The agents form a sequential pipeline. Each phase reads structured markdown files produced by the previous phase.

```
bug-researcher → bug-research-verifier → bug-planner → bug-fixer
                                                           ↓
                              unit-tests-generator ← security-verifier
```

| Phase | Agent | Input | Output |
|---|---|---|---|
| 1 Research | `bug-researcher` | Source code | `research/bugs/*.md`, `research/codebase-research.md` |
| 2 Verify | `bug-research-verifier` | Bug files | `research/verified-research.md` |
| 3 Plan | `bug-planner` | Verified research | `research/fixes/*.md` |
| 4 Fix | `bug-fixer` | Fix plans | `research/outputs/*.md` |
| 5 Security | `security-verifier` | Git diff + outputs | `research/security-report.md` |
| 6 Test | `unit-tests-generator` | Git diff + outputs | `tests/*.test.js`, `research/test-report.md` |

---

## Agents

### `bug-researcher`
**Model**: Sonnet | **Tools**: Glob, Grep, Read, Write

Scans the codebase across 12 bug categories (logic errors, null handling, security, race conditions, resource leaks, edge cases, type errors, data integrity, API misuse, performance, dead code, error handling). For each finding it writes a structured report to `./research/bugs/XXX-short-title.md` and generates a prioritised summary index at `./research/codebase-research.md`.

Trigger: after significant code changes, pre-release audits, or refactors.

---

### `bug-research-verifier`
**Model**: Opus | **Tools**: Glob, Grep, Read, Edit, Write, Skill (`research-quality-management`)

Reads every individual bug file referenced in `codebase-research.md`, applies the `research-quality-management` skill to evaluate quality against five objective criteria, and writes a consolidated verdict file at `./research/verified-research.md`. Each bug is stamped **VERIFIED**, **NEEDS IMPROVEMENT**, **INSUFFICIENT**, or **MISSING REPORT**.

Trigger: after all individual bug reports are written.

---

### `bug-planner`
**Model**: Sonnet | **Tools**: Glob, Grep, Read, Edit, Write

Reads `./research/verified-research.md` and, for every verified bug, writes a developer-ready fix plan to `./research/fixes/XXX-title.md`. Each plan includes: root cause, affected files, step-by-step implementation, edge cases to handle, testing requirements, and acceptance criteria.

Trigger: after bug research is verified and fix planning needs to begin.

---

### `bug-fixer`
**Model**: Haiku | **Tools**: Glob, Grep, Read, Edit, NotebookEdit, Write

Iterates over all files in `./research/fixes/`, implements each fix exactly as specified (or documents any deviation), and writes an implementation report to `./research/outputs/XXX-title.md` with before/after code snippets, reasoning, risks, and manual verification steps.

Trigger: when fix plans are ready and implementation is requested.

---

### `security-verifier`
**Model**: Opus | **Tools**: Glob, Grep, Read, Edit, Write

Collects uncommitted changes via `git diff` and reads all files in `./research/outputs/`. Systematically checks for OWASP Top 10 and CWE vulnerabilities, classifies findings by severity (CRITICAL → INFORMATIONAL), and writes `./research/security-report.md`.

Trigger: after code modifications, or when new files appear in `./research/outputs/`.

---

### `unit-tests-generator`
**Model**: Opus | **Tools**: Glob, Grep, Read, Edit, Write, Skill (`unit-tests-FIRST`), Bash, PowerShell

Detects uncommitted changes via `git diff` and parses markdown files in `./research/outputs/` for test requirements. Generates tests using the `unit-tests-FIRST` skill, places them in `./tests/`, runs the Jest suite, and writes a pass/fail summary to `./research/test-report.md`.

Trigger: after a significant piece of code is written or modified.

---

## Skills

### `research-quality-management`
Evaluates bug reports against five objective criteria:

| Criterion | Checks |
|---|---|
| Root Cause Analysis | Specific, plausible cause traceable to code |
| Reproducibility | Steps are clear, ordered, and complete |
| Impact Assessment | Severity justified with scope and business impact |
| Evidence Quality | Claims backed by file paths and line numbers |
| Internal Consistency | Symptoms align with root cause; fix addresses cause |

**Scoring**: 4–5 criteria pass = High; 2–3 = Medium; 0–1 = Low. Each claim is marked ✅ Verified, ❌ Contradicted, or ⚠️ Unverified.

Used by: `bug-research-verifier`.

---

### `unit-tests-FIRST`
Creates unit tests that follow the FIRST principles using Jest + supertest:

| Principle | Implementation |
|---|---|
| **Fast** | Mocks slow deps: bcrypt (~100–200 ms), databases, external APIs |
| **Independent** | Each test resets its own state via `jest.resetModules()` + `beforeEach()` |
| **Repeatable** | No `Date.now()` / `Math.random()`; no hardcoded ports; deterministic env vars |
| **Self-validating** | Explicit assertions on both HTTP status code and response body |
| **Timely** | Bug regressions encoded as dedicated regression test cases |

`tests/helpers/loadApp.js` intercepts `http.Server.prototype.listen` so the real server never binds a port during tests.

Used by: `unit-tests-generator`.

---

## Project Structure

```
homework-4/
├── src/
│   └── app.js               # Express Todo API
├── tests/
│   ├── helpers/loadApp.js   # Test utility — loads app without binding a port
│   ├── auth.test.js         # Auth endpoint tests (30+ cases)
│   ├── todos.test.js        # CRUD endpoint tests
│   └── startup.test.js      # App initialisation tests
├── research/
│   ├── codebase-research.md # Bug index (generated by bug-researcher)
│   ├── verified-research.md # Quality-assessed summary (bug-research-verifier)
│   ├── security-report.md   # Security findings (security-verifier)
│   ├── test-report.md       # Test run summary (unit-tests-generator)
│   ├── bugs/                # Individual bug reports (001–008)
│   ├── fixes/               # Implementation fix plans (001–008)
│   └── outputs/             # Applied-fix reports + IMPLEMENTATION_SUMMARY.md
└── .claude/
    ├── agents/              # Six agent definition files
    ├── skills/              # Two skill definition files
    └── settings.json
```

---

## Running Tests

```bash
npm test
# or
npx jest --testPathPattern=tests/
```
