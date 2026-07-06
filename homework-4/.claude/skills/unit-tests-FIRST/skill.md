---
name: unit-tests-FIRST
description: Creates or updates unit tests applying the FIRST principles — Fast (mock slow deps like bcrypt/DB), Independent (each test resets its own state), Repeatable (no live Date/Math.random), Self-validating (explicit assertions with clear failure messages), Timely (covers exactly what's needed). Places all tests in ./tests. Use this skill only when the user explicitly asks to run unit tests inline in the current context (e.g. "write unit tests now", "add tests here"). Do NOT trigger when the user asks to run tasks in parallel, in the background, or alongside other agents — in those cases prefer the unit-tests-generator agent.
tools: Glob, Grep, Read, Edit, Write
---

## Your Mission

Write or update unit tests that embody the FIRST principles — not as a checklist to tick, but as properties that make the suite genuinely trustworthy and maintainable long-term.

**IMPORTANT**: Only create or modify test files. Never change application source code.

## Step 1: Detect the Test Setup

Check `package.json` for existing test dependencies and scripts. Scan `./tests/` for existing test files to match their style and framework.

**If no test framework is installed**, set up **Jest** (and `supertest` for HTTP endpoints):

```bash
npm install --save-dev jest supertest
```

Add to `package.json` scripts:
```json
"test": "jest --testPathPattern=tests/"
```

If a framework already exists, match it — don't introduce a second one.

## Step 2: Plan Tests

For each function, class, or HTTP endpoint being tested:

- **Happy path** — correct input produces correct output/status
- **Validation errors** — invalid or missing fields get the right rejection
- **Authorization boundaries** — users can only affect their own resources
- **Bug regressions** — if a specific bug was fixed, write a test that would have caught it in the old code; this is the most valuable test you can write

Group related cases with `describe()` named after the behavior unit (e.g., `describe('DELETE /todos/:id', ...)`) and use test names that read as specifications: `'returns 404 when todo belongs to a different user'`, not `'test DELETE'`.

## Step 3: Apply FIRST

### Fast
Slow dependencies kill developer feedback loops. Mock them so the suite stays in milliseconds.

- **bcrypt** — 12 rounds ≈ 100–200ms per call. Always mock it:
  ```js
  jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('$hashed'),
    compare: jest.fn().mockResolvedValue(true),
  }));
  ```
- **jsonwebtoken** — mock `jwt.sign` to return a fixed string and `jwt.verify` to return a fixed payload; let the real implementation run only in tests that specifically exercise token validation logic.
- **Databases, external APIs, file system** — mock or stub; never make real network calls.
- **HTTP layer** — use `supertest`'s `request(app)` which binds the app to an ephemeral port internally; never call `app.listen()` in tests.

### Independent
Tests that share state fail unpredictably and are impossible to debug in isolation.

- Each test must set up its own fixtures and clean up after itself.
- If the module holds mutable in-memory state (arrays, counters, objects), isolate it with `jest.resetModules()` and re-require inside `beforeEach`:
  ```js
  let app;
  beforeEach(() => {
    jest.resetModules();
    jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('$h'), compare: jest.fn().mockResolvedValue(true) }));
    process.env.JWT_SECRET = 'a-thirty-two-character-test-secret!!';
    app = require('../src/app');
  });
  ```
- Never read state written by a previous test. If you find yourself writing `// must run after test X`, stop and redesign.

### Repeatable
A test that passes locally but fails in CI is worthless.

- **No `Date.now()` or `new Date()` in assertions** without mocking them first:
  ```js
  jest.useFakeTimers().setSystemTime(new Date('2024-01-15T10:00:00Z'));
  ```
- **No `Math.random()`** — seed it or mock it.
- **No hardcoded ports** — let supertest choose.
- **No environment-specific credentials** — use `process.env` with test-specific values set in `beforeEach`.

### Self-validating
A test that requires a human to read output to determine pass/fail is not a test.

- Every test must have at least one explicit assertion.
- Assert on **both** the HTTP status code **and** the response body:
  ```js
  expect(res.statusCode).toBe(404);
  expect(res.body).toMatchObject({ error: 'Todo not found' });
  ```
- Use `.toMatchObject()` when you care about a subset of fields.
- Prefer `.toEqual()` over `.toBe()` for objects.
- Write test names that describe the expected behavior, not the mechanism.

### Timely
Tests should be written at the same time as the code they cover, not as an afterthought.

- Cover the behavior that was just written or changed.
- If a bug was fixed, add a regression test that encodes the correct behavior so the same bug can never silently reappear.

## Step 4: Handle the app.listen Pattern

Express apps that call `app.listen()` at module load time start a real server when required, conflicting with supertest. The recommended fix is to separate the app from server startup:

- `src/app.js` — builds and exports the Express app; does not call `listen()`
- `src/server.js` — requires the app and calls `listen()`

If that separation isn't feasible, use a `tests/setup.js` that intercepts `http.Server.prototype.listen` before any test module is loaded:

```js
// tests/setup.js
const http = require('http');
http.Server.prototype.listen = function (...args) {
  if (typeof args[args.length - 1] === 'function') args[args.length - 1]();
  return this;
};
```

Wire it up in `package.json`:
```json
"jest": {
  "setupFiles": ["./tests/setup.js"]
}
```

## Step 5: Write the Test Files

- **One file per source module**: `tests/auth.test.js`, `tests/todos.test.js`
- **Add to existing files** rather than replacing them — preserve passing tests
- Match the existing naming convention (`*.test.js` or `*.spec.js`)
- Set any required env vars (e.g., `JWT_SECRET`) inside `beforeEach` or at the top of the file

## Step 6: Report What You Did

Finish with a summary:

- Which test files were created or updated
- How many test cases were added and what behavior each group covers
- Any setup the user needs to run (`npm install`, env vars, etc.)
- The command to run the tests: `npm test` or equivalent
