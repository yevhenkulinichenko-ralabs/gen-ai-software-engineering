# Agent Guidelines — Virtual Card Lifecycle API

This document defines how an AI coding agent should behave when implementing the specification in this project. Read it alongside `specification.md` before writing any code.

---

## Technology Stack Assumptions

- **Node.js ≥ 20 LTS** — use `crypto.randomUUID()` and `crypto.randomBytes()` (native); do not install `uuid` as a runtime dep if Node 20 is confirmed
- **Express.js 4.x** — use `express.Router()`; do not use Express 5 APIs
- **Sequelize 6.x** — use `sequelize.define()` or `Model.init()`; use `sequelize-cli` migrations; do not use `sync({ force: true })` in production code
- **PostgreSQL 15** — use `DECIMAL(15,2)` for money; never `FLOAT`; use `JSONB` for metadata/audit fields
- **Joi 17.x** — all request validation through Joi schemas; no custom validator spaghetti
- **Jest + Supertest** — integration tests via `supertest(app)`; unit tests mock Sequelize with `jest.mock()`
- **winston** — structured JSON logging; never `console.log` in production paths

---

## Domain Rules (Banking / FinTech)

### PAN and Sensitive Data
- **Never log PAN, CVV, or full card number** at any log level. This is a hard rule with no exceptions.
- **Never return `pan_encrypted` in any API response.** Override `toJSON()` on the Card model to omit it.
- **CVV is generated once and never stored.** Return it in the card creation response only; after that it is gone.
- `maskPan()` is the only function that reads the last four digits; everywhere else, use `pan_last_four`.
- When sanitizing metadata before audit writes, recursively remove any key matching `/pan|card_number|cvv|cvc|full_number/i`.

### Money
- Store all amounts as `DECIMAL(15,2)` strings. Sequelize returns DECIMAL as a string — do not coerce to float.
- Serialize amounts as JSON strings (`"42.50"`, not `42.5`). Joi schemas must validate amounts as strings matching `/^\d+(\.\d{1,2})?$/`.
- Arithmetic for limit checks: convert to integer cents via `Math.round(parseFloat(amount) * 100)`.
- Never use `parseFloat` or `Number()` for final storage or comparison — only for intermediate cent arithmetic.

### State Machine
- Enforce the card state machine strictly. If a requested transition is not in the allowed list (see `specification.md`), return `ApiError(422, 'INVALID_STATE_TRANSITION')`.
- Every state transition must happen inside a `sequelize.transaction()` block with a `SELECT ... FOR UPDATE` row lock.
- Never update card status outside of `cardService.js`.

### Idempotency
- Every POST and state-change PATCH requires an `Idempotency-Key` header. Missing key → 400 `MISSING_IDEMPOTENCY_KEY`.
- Idempotency logic lives entirely in `src/middleware/idempotency.js`. Do not duplicate it in controllers or services.

### Audit Trail
- Every card operation and every transaction (completed or declined) must produce an audit log entry.
- `auditService.log()` must never throw — log the DB failure to winston and return `null`.
- Audit records are immutable. Do not write `UPDATE` or `DELETE` queries against `audit_logs`.
- The `metadata` field in audit records must never contain PAN, CVV, or passwords.

### Access Control
- Ownership checks must happen at the database query level: `WHERE id = ? AND user_id = ?`. Do not fetch a card and then check ownership in application code — this opens IDOR vulnerabilities.
- When a user requests another user's resource, return HTTP 404 (not 403) to prevent ID enumeration.

---

## Code Style

- **No `console.log`** — use `winston` logger (imported as `logger` from `src/utils/logger.js` if created)
- **All async route handlers** wrapped with `asyncHandler()` from `src/utils/asyncHandler.js`
- **Error propagation**: services throw `ApiError`; controllers call `next(err)` on caught errors; never call `res.status().json()` directly inside catch blocks in controllers
- **No raw SQL strings** in application code — use Sequelize operators and parameterized queries
- **File naming**: camelCase for all JS files; singular model names (`User.js`, not `Users.js`)
- **No default exports** — use named exports throughout; `module.exports = { fn1, fn2 }` pattern
- **Environment variables**: accessed only via `process.env.*`; validated at startup (throw if required vars are missing)
- **No circular imports**: models → config; services → models; controllers → services; routes → controllers + middleware

---

## Testing and Verification Expectations

- **Unit tests mock the DB**: when writing unit tests for services, mock `Model.create`, `Model.findOne`, etc. with `jest.spyOn()` or `jest.mock()`. Unit tests must never hit a real database.
- **Integration tests use a real PostgreSQL test database** (`DATABASE_URL_TEST`). Do not mock Sequelize in integration tests.
- **Each integration test file truncates all tables in `beforeEach`** using the setup helper.
- **Coverage thresholds are enforced** in `jest.config.js`. Do not lower them.
- **Acceptance criteria** at the end of each Low-Level Task in `specification.md` are the definition of done for that task. Do not mark a task complete until all its acceptance criteria pass.
- Write tests in the same commit as the feature code. Do not leave test files as future work.

---

## Security and Compliance Constraints

- **bcryptjs cost factor ≥ 12** for all password and refresh token hashing. Do not lower this.
- **JWT RS256 only** — do not use HS256 (symmetric); the private key must stay server-side.
- **Refresh token rotation**: on every successful refresh, revoke the old token and issue a new pair. On replayed revoked token, revoke entire family.
- **Rate limiting skipped in test environment** (`NODE_ENV === 'test'`). Never skip it in `production`.
- **Helmet** must be mounted before all routes.
- **Input validation** via Joi runs before any service call. Never trust `req.body` in service or model layer without prior validation.
- **SQL injection**: Sequelize parameterized queries are sufficient. Never interpolate user input into query strings or `Sequelize.literal()`.
- **Error messages**: do not leak stack traces, DB column names, or internal IDs in 4xx/5xx responses in production. The `errorHandler` middleware handles this.

---

## How the Agent Should Treat Edge Cases

1. **Prefer explicit over clever**: write out all state transition cases in a switch or if-else; do not derive valid transitions from a graph at runtime.
2. **Fail loudly at startup** for missing environment variables (encryption key, JWT keys). Do not fail silently at request time.
3. **On DB transaction failure**: roll back, log at `error` level, re-throw as `ApiError(500, 'INTERNAL_ERROR')`. Do not swallow errors in service functions.
4. **Concurrent writes**: always use `SELECT ... FOR UPDATE` when reading a row before updating its status. Never read-then-write without a lock.
5. **Declined transactions are not errors**: when a spending limit is exceeded, create a DECLINED transaction record and return it normally. Do not throw.
6. **Idempotency key conflicts**: the idempotency middleware must distinguish between a replay (same body → return cached) and a conflict (different body → 409). Implement both branches.
7. **Never assume a Decimal is a number**: always use `parseFloat()` explicitly and only for intermediate arithmetic, then convert back to string for storage.
8. **Audit log failures are non-fatal**: if `auditService.log()` fails, log to winston and continue the operation. Audit failure must not roll back the card or transaction.
