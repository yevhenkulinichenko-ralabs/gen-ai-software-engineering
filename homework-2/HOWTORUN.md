# How to Run

## Prerequisites

- Node.js 18 or later
- npm 9 or later

## Installation

```bash
npm install
```

## Starting the Server

```bash
# Production (stays running until killed)
npm start

# Development (restarts on file changes)
npm run dev
```

The server starts on port 3000 by default. Set `PORT` to override:

```bash
PORT=4000 npm start
```

Verify it is running:

```bash
curl http://localhost:3000/tickets
# → []
```

---

## Running Tests

There are four test commands. Each targets a different layer of the stack.

### Unit and API tests

```bash
npm test
```

Runs all tests that do **not** require a live server: unit tests for the classifier, parsers, and Joi schemas, plus HTTP endpoint tests using an in-process Express app. Produces a coverage report at the end.

```bash
npm run test:watch   # re-runs affected tests on file save
```

### Integration tests

```bash
npm run test:integr
```

Starts the server on port 3000, runs multi-step workflow tests (CRUD lifecycle, auto-classify on creation, override detection, batch import), then stops the server. No manual server management needed.

### End-to-end tests

```bash
npm run test:e2e
```

Same lifecycle (auto-start / auto-stop). Covers the full ticket lifecycle, bulk import followed by parallel auto-classification, 25 concurrent creates, and combined query-parameter filtering.

### Performance benchmarks

```bash
npm run test:perf
```

Same lifecycle. Measures import throughput (100 records), list and filter response times, and auto-classify latency against defined thresholds.

---

## Targeting a Different Port

All live-server test commands (`test:integr`, `test:e2e`, `test:perf`) read the `API_URL` environment variable. To run against a server already listening on port 4000:

```bash
API_URL=http://localhost:4000 npm run test:integr
API_URL=http://localhost:4000 npm run test:e2e
API_URL=http://localhost:4000 npm run test:perf
```

When `API_URL` is set, `start-server-and-test` still starts its own server on the default port — to avoid the conflict, start the server manually and run Jest directly:

```bash
npm start &
API_URL=http://localhost:3000 npx jest --config jest.integr.config.js --verbose
```

---

## Running a Single Test File

```bash
npx jest tests/test_ticket_api.test.js
npx jest tests/test_categorization.test.js --verbose
```

Live-server test files must be run against a running server:

```bash
npm start &
npx jest --config jest.integr.config.js --verbose
npx jest --config jest.e2e.config.js --verbose
npx jest --config jest.perf.config.js --verbose
```

---

## Sample Data

The `demo/` directory contains ready-to-import files:

| File | Format | Records |
|------|--------|---------|
| `demo/sample_tickets.json` | JSON array | 20 |
| `demo/sample_tickets.csv` | CSV | 50 |
| `demo/sample_tickets.xml` | XML | 30 |

Import them while the server is running:

```bash
curl -X POST http://localhost:3000/tickets/import \
  -H "Content-Type: application/json" \
  --data-binary @demo/sample_tickets.json

curl -X POST http://localhost:3000/tickets/import \
  -H "Content-Type: text/csv" \
  --data-binary @demo/sample_tickets.csv

curl -X POST http://localhost:3000/tickets/import \
  -H "Content-Type: application/xml" \
  --data-binary @demo/sample_tickets.xml
```
