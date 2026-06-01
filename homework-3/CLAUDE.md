# CLAUDE.md — Virtual Card Lifecycle API

AI coding rules for this project. Read before writing any code.

## Stack

Node.js 20 LTS · Express.js 4 · Sequelize 6 · PostgreSQL 15 · Jest + Supertest

## Project Layout

```
src/
  app.js          ← Express factory (no listen)
  server.js       ← entry point
  config/         ← database.js (Sequelize instance)
  models/         ← one file per model, named exports
  migrations/     ← sequelize-cli format
  middleware/     ← auth, rbac, validate, idempotency, rateLimiter, requestId, errorHandler
  routes/         ← auth, cards, transactions, admin
  controllers/    ← one file per route group
  services/       ← cardService, transactionService, auditService, encryptionService
  schemas/        ← Joi schemas
  utils/          ← asyncHandler, apiResponse, ApiError, jwt, cardGenerator
tests/
  setup.js
  fixtures/factories.js
  unit/
  integration/
```

## Hard Rules (no exceptions)

- **Never log PAN, CVV, or full card number** — not at debug, not at error, not anywhere.
- **Never return `pan_encrypted` in any response** — Card `toJSON()` must omit it.
- **All amounts are DECIMAL strings** — store as `DECIMAL(15,2)`, serialize as `"42.50"` (string), never float.
- **All async handlers wrapped in `asyncHandler()`** — no bare async route functions.
- **Ownership checked at query level** (`WHERE id=? AND user_id=?`) — never fetch then check in app code.
- **State transitions inside `sequelize.transaction()` + `SELECT ... FOR UPDATE`** — always.
- **`auditService.log()` never throws** — swallow DB errors and log to winston.
- **AuditLog records are immutable** — never UPDATE or DELETE from `audit_logs`.
- **Rate limiting skips in `NODE_ENV=test`** — never skip in production.

## Naming & Style

- Named exports only: `module.exports = { fn }` — no default exports
- camelCase files; singular Model names (`User.js`, not `Users.js`)
- No `console.log` — use `winston` logger
- No raw SQL strings — use Sequelize operators/parameterized queries
- Import order: stdlib → third-party → local (blank line between groups)

## Error Handling

- Services throw `ApiError(statusCode, code, details?)`
- Controllers catch and call `next(err)` — never `res.status().json()` in catch blocks
- `errorHandler.js` (4-arg) is the single place that sends error responses
- 500 errors: log stack at `error` level; never send stack to client in production

## Money Arithmetic

```js
// For comparisons only — never store as int
const amountCents = Math.round(parseFloat(amountStr) * 100);
const limitCents  = Math.round(parseFloat(limitStr)  * 100);
if (amountCents > limitCents) { /* decline */ }
```

## Card State Machine

```
PENDING → ACTIVE (activate)
ACTIVE  → FROZEN (freeze)
FROZEN  → ACTIVE (unfreeze)
ACTIVE  → CLOSED (close)
FROZEN  → CLOSED (close)
```
Any other transition → `ApiError(422, 'INVALID_STATE_TRANSITION')`.

## API Response Shapes

Success:
```json
{ "data": { ... }, "meta": { "requestId": "...", "timestamp": "..." } }
```
Error:
```json
{ "error": { "code": "SNAKE_CASE", "message": "human-readable", "details": [] } }
```

## Testing

- **Unit tests**: mock Sequelize with `jest.spyOn` / `jest.mock`. No real DB.
- **Integration tests**: real PostgreSQL via `DATABASE_URL_TEST`; truncate tables in `beforeEach`.
- Coverage thresholds enforced in `jest.config.js`: statements 80%, branches 75%, functions 80%, lines 80%.
- Run unit tests: `npm run test:unit` (must complete < 10s)
- Run all tests: `npm test` (must complete < 60s)

## Security Defaults

- bcryptjs cost factor **12** — do not lower
- JWT **RS256** — do not use HS256
- `helmet()` mounted before all routes
- Joi validation runs before every service call
- Missing env vars (`PAN_ENCRYPTION_KEY`, `JWT_PRIVATE_KEY`, etc.) → throw at startup

## What NOT To Do

- Do not call `app.listen()` in `app.js` — only in `server.js`
- Do not use `sequelize.sync({ force: true })` outside of test setup
- Do not use `Sequelize.literal()` with user-controlled input
- Do not skip idempotency checks on POST or state-change PATCH endpoints
- Do not add `updated_at` to `audit_logs` — the table is append-only
- Do not return HTTP 403 when a user requests another user's resource — return 404
