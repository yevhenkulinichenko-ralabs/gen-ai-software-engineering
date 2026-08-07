# CLAUDE.md — Virtual Card Lifecycle API

> For domain rules, security policy, and coding conventions see [`agents.md`](agents.md).

## Development Commands

```bash
npm run dev               # start with nodemon (PORT from .env)
npm run migrate           # run pending Sequelize migrations
npm run migrate:undo      # rollback last migration
npm run migrate:undo:all  # rollback all migrations
npm test                  # full suite against DATABASE_URL_TEST (< 60s)
npm run test:unit         # unit tests only, no DB required (< 10s)
npm run test:integration  # integration tests only
npm run lint              # ESLint check
```

Run a single test file:
```bash
npm test -- tests/integration/cards.test.js
```

## Environment Setup

Copy `.env.example` to `.env`, then fill in:

```bash
# Generate PAN encryption key (must be exactly 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate RS256 key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Requires PostgreSQL 15 on port 5432 and Redis on port 6379. Create two databases: one for development (`DATABASE_URL`) and one for tests (`DATABASE_URL_TEST`).

## Where Things Live

| Concern | Location |
|---------|----------|
| Business rules | `src/services/` — never in controllers |
| Request validation schemas | `src/schemas/` — one file per route group |
| All `ApiError` codes | `src/utils/ApiError.js` |
| JWT sign / verify | `src/utils/jwt.js` — nowhere else |
| Audit writes | always via `auditService.log()` — never direct `AuditLog.create()` |
| Idempotency logic | `src/middleware/idempotency.js` — never duplicated in services |

## Known Gotchas

- Sequelize returns `DECIMAL` columns as strings. Never coerce with `Number()` — pass the string through as-is for storage and use cent arithmetic only for comparisons.
- `tests/setup.js` truncates tables in FK-safe order. If you add a new model, add it to the truncate list there.
- `NODE_ENV=test` disables rate limiting. Never set it outside the test environment.
- `auditService.log()` swallows DB errors by design — it will not throw and will not roll back the parent transaction.
- `AuditLog` has no `updatedAt` column. Sequelize will error if you let it try to set one — keep `timestamps: false` on that model.
- The idempotency middleware intercepts duplicate requests before they reach the controller. Do not add idempotency checks inside services.

## Migration Conventions

- Never edit a committed migration — create a new one instead.
- Generate: `npx sequelize-cli migration:generate --name describe-what-changes`
- Always run `npm run migrate` after pulling changes that include new migration files.
- One migration per PR.

## Card State Machine (quick lookup)

```
PENDING → ACTIVE   (activate)
ACTIVE  → FROZEN   (freeze)
FROZEN  → ACTIVE   (unfreeze)
ACTIVE  → CLOSED   (close)
FROZEN  → CLOSED   (close)
```

## API Response Shapes (quick lookup)

```json
{ "data": { ... }, "meta": { "requestId": "...", "timestamp": "..." } }
{ "error": { "code": "SNAKE_CASE", "message": "...", "details": [] } }
```

## Money Arithmetic (quick lookup)

```js
// Comparisons only — never store as int
const amountCents = Math.round(parseFloat(amountStr) * 100);
const limitCents  = Math.round(parseFloat(limitStr)  * 100);
if (amountCents > limitCents) { /* decline */ }
```
