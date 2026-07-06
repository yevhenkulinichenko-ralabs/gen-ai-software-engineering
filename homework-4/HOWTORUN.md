# How to Run

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Claude Code CLI](https://claude.ai/code) (for the agent pipeline only)

---

## Running the App

### 1. Install dependencies

```bash
npm install
```

### 2. Start the server

```bash
npm start
```

The API starts on `http://localhost:3000` by default. Override the port with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### 3. Try it out

```bash
# Login (auto-registers on first call)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice"}'
# → { "token": "<base64-token>" }

# Create a todo (replace <token> with the value above)
curl -X POST http://localhost:3000/todos \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy milk"}'

# List todos
curl http://localhost:3000/todos \
  -H "Authorization: Bearer <token>"

# Update a todo
curl -X PUT http://localhost:3000/todos/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Delete a todo
curl -X DELETE http://localhost:3000/todos/1 \
  -H "Authorization: Bearer <token>"
```

---

## Running the Agent Pipeline

The pipeline runs six Claude Code agents in sequence to research, plan, fix, and test the codebase. It requires the `claude` CLI to be authenticated.

### Prerequisites

Verify the CLI is installed and logged in:

```bash
claude --version
claude auth status
```

### Run the full pipeline

```bash
bash run-pipeline.sh
```

The script runs agents in this order:

```
bug-researcher → bug-research-verifier → bug-planner → bug-fixer
                                                           ↓
                              unit-tests-generator ← security-verifier
```

Phases 1–4 run sequentially (each waits for the previous). Phases 5 and 6 run in parallel.

| Phase | Agent | Output |
|---|---|---|
| 1 | `bug-researcher` | `research/bugs/*.md`, `research/codebase-research.md` |
| 2 | `bug-research-verifier` | `research/verified-research.md` |
| 3 | `bug-planner` | `research/fixes/*.md` |
| 4 | `bug-fixer` | `research/outputs/*.md` |
| 5 | `security-verifier` | `research/security-report.md` |
| 6 | `unit-tests-generator` | `tests/*.test.js`, `research/test-report.md` |

### Logs

Each agent writes its full output to `.pipeline-logs/<agent-name>.log`. Check these if an agent fails:

```bash
cat .pipeline-logs/bug-researcher.log
```

### Run a single agent

To run one agent in isolation without the pipeline script:

```bash
claude --agent bug-researcher -p "Analyse the codebase and produce bug research reports."
```

---

## Running Tests

```bash
npm test
```

Tests live in `tests/` and use Jest + supertest. The helper at `tests/helpers/loadApp.js` loads the Express app without binding a real port, so tests run fully in-process.
