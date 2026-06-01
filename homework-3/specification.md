# Virtual Card Lifecycle Management API — Specification

> Ingest the information from this file, implement the Low-Level Tasks, and generate the code that will satisfy the High and Mid-Level Objectives.

---

## High-Level Objective

Build a production-grade RESTful API that enables end-users to manage virtual payment cards (create, activate, freeze/unfreeze, set spending limits, view transactions, and close) while providing internal ops and compliance staff with auditable oversight of all card operations. The system must meet the auditability, security, and data-handling standards expected in a regulated payment environment. Scope boundary: card issuance and lifecycle only — no payment network integration, no physical card fulfillment.

---

## Mid-Level Objectives

1. **Card Lifecycle Management** — A user can create, activate, freeze, unfreeze, and permanently close a virtual card; each state transition is validated against the defined state machine, persisted atomically, and immediately reflected in subsequent reads.

2. **Spending Limit Control** — A user can set and update per-card daily, monthly, and per-transaction spending limits; the API enforces all active limits during transaction authorization and returns a specific decline reason when any limit is exceeded.

3. **Transaction Visibility** — A user can retrieve a paginated, chronologically ordered list of transactions for any card they own, with filtering by status and date range; pagination uses a stable cursor so concurrent inserts do not cause rows to be skipped or duplicated across pages.

4. **Compliance Audit Trail** — Every card operation (creation, state change, limit update, closure) and every transaction (completed or declined) is recorded in an immutable audit log; compliance officers can query the log by actor, resource, action, and date range.

5. **Role-Based Access Control** — End-users access only their own cards and transactions; ops/compliance staff can read all cards and audit logs; no API endpoint, regardless of caller role, returns plaintext PAN or CVV.

6. **Idempotent Writes** — Card creation and all state-change requests accept an `Idempotency-Key` header and return identical responses for duplicate requests within a 24-hour window, preventing double-issuance and duplicate state transitions.

---

## Non-Functional Requirements & Policy

### Security
- PAN stored AES-256-GCM encrypted; only last four digits returned in any API response.
- CVV never persisted; generated at card creation, returned in the creation response only, then discarded.
- JWT RS256: access token TTL 15 minutes; refresh token TTL 7 days; refresh tokens stored as bcrypt hashes.
- Refresh token family rotation: if a revoked refresh token is replayed, revoke the entire family for that user.
- Passwords hashed with bcryptjs cost factor ≥ 12.

### Privacy & Compliance
- PAN masked as `****-****-****-XXXX` in all API responses regardless of caller role.
- Audit logs are append-only; no UPDATE or DELETE on `audit_logs` table is permitted by any application role.
- Audit log retention: 7 years (regulatory minimum for payment records).
- GDPR: user data deletion replaces PII fields with tombstone tokens; card records soft-deleted; audit logs retained with actor_id preserved.
- Each audit entry must record: `actor_id`, `actor_role`, `action`, `resource_type`, `resource_id`, `ip_address`, `created_at` (UTC, millisecond precision).

### Reliability
- All writes that span multiple tables wrapped in a Sequelize-managed DB transaction; partial failures roll back completely.
- Card state transitions use row-level locking (`SELECT ... FOR UPDATE`) inside a DB transaction to prevent concurrent race conditions.
- Idempotency window: 24 hours per `(user_id, idempotency_key)` pair.

### Performance (assumed targets — FinTech UX baseline)

| Operation | p50 | p95 | p99 | Rationale |
|-----------|-----|-----|-----|-----------|
| GET card details | 30ms | 80ms | 150ms | Single indexed PK lookup |
| GET transaction list (page 1) | 40ms | 120ms | 200ms | Composite index on `(card_id, created_at)` |
| POST create card | 60ms | 200ms | 350ms | Encryption + 2 DB writes |
| PATCH freeze / unfreeze | 40ms | 150ms | 250ms | Lock + write + audit |
| PATCH update limits | 40ms | 150ms | 250ms | Single row update + audit |
| GET audit logs (compliance) | 80ms | 400ms | 700ms | Not user-facing; broader scan acceptable |

*Baseline: single-region PostgreSQL 15, connection pool min 5 / max 20, no external service calls in the critical path.*

### Rate Limiting

| Endpoint group | Limit | Window | Key |
|----------------|-------|--------|-----|
| Auth endpoints (unauthenticated) | 20 req | 1 min | IP |
| User write endpoints (POST, PATCH, DELETE) | 60 req | 1 min | user_id |
| User read endpoints (GET) | 120 req | 1 min | user_id |
| Admin / compliance endpoints | 30 req | 1 min | user_id |

Rate limit exceeded → HTTP 429 with `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers.

### Pagination
- Default page size: 20; maximum: 100.
- Transactions: cursor-based pagination on composite `(created_at DESC, id)` — stable under concurrent inserts.
- Audit logs: offset-based pagination (compliance queries, lower concurrency).

---

## Implementation Notes

### Technology Stack
- **Runtime**: Node.js ≥ 20 LTS
- **Framework**: Express.js 4.x
- **ORM**: Sequelize.js 6.x + `sequelize-cli` for migrations
- **Database**: PostgreSQL 15+
- **Validation**: Joi 17.x
- **Auth**: `jsonwebtoken` (RS256), `bcryptjs`
- **Encryption**: Node.js native `crypto` (AES-256-GCM)
- **Rate limiting**: `express-rate-limit` + `rate-limit-redis` + `ioredis`
- **Testing**: Jest + Supertest
- **Logging**: `winston`, JSON format, level from `LOG_LEVEL` env var

### Money Handling
- All amounts stored as `DECIMAL(15,2)` in PostgreSQL — never `FLOAT` or `DOUBLE`.
- All amounts serialized as **strings** in JSON responses (e.g., `"amount": "42.50"`) to prevent JavaScript float precision loss.
- Currency stored as ISO 4217 three-letter code (`"USD"`).

### Identifiers
- All resource IDs: UUID v4, generated server-side via `crypto.randomUUID()`.
- Card numbers: 16-digit strings generated with `crypto.randomBytes`; stored without dashes.
- Expiry: displayed as `MM/YY`; stored as separate `expiry_month` (INT 1–12) and `expiry_year` (INT 4-digit) columns.

### API Conventions
- Base path: `/api/v1/`
- All responses: `Content-Type: application/json`
- Error shape: `{ "error": { "code": "SNAKE_CASE_CODE", "message": "human-readable", "details": [...] } }`
- Success shape: `{ "data": <payload>, "meta": { "requestId": "...", "timestamp": "..." } }`
- HTTP status codes: 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500
- `requestId` (UUID v4) generated per request, present in response body `meta` and `X-Request-Id` header

### Card State Machine
```
PENDING  ──activate──►  ACTIVE
ACTIVE   ──freeze──►    FROZEN
FROZEN   ──unfreeze──►  ACTIVE
ACTIVE   ──close──►     CLOSED
FROZEN   ──close──►     CLOSED
PENDING  ──close──►     CLOSED  (admin/ops only)
```
Any transition not listed above → HTTP 422, code `INVALID_STATE_TRANSITION`.

### Environment Variables
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DATABASE_URL_TEST=postgresql://user:pass@host:5432/dbname_test
JWT_PRIVATE_KEY=<RS256 PEM>
JWT_PUBLIC_KEY=<RS256 PEM>
PAN_ENCRYPTION_KEY=<32-byte hex string>
REDIS_URL=redis://localhost:6379
NODE_ENV=development|test|production
LOG_LEVEL=info
PORT=3000
```

### Error Handling Rules
- Sequelize `ValidationError` → HTTP 422.
- Sequelize `UniqueConstraintError` → HTTP 409.
- JWT `TokenExpiredError` → HTTP 401, code `TOKEN_EXPIRED`.
- JWT `JsonWebTokenError` → HTTP 401, code `TOKEN_INVALID`.
- Generic unhandled errors → HTTP 500; stack trace logged at `error` level, never returned to client in production.

### Idempotency Implementation
- Clients send `Idempotency-Key: <UUID>` on all POST and state-change PATCH requests.
- Server stores `(user_id, idempotency_key, sha256(request_body), response_status, response_body)` in `idempotency_keys` table.
- Duplicate key within 24h → return stored response + `X-Idempotency-Replay: true` header.
- Same key, different body hash → HTTP 409, code `IDEMPOTENCY_CONFLICT`.
- Missing key on required endpoints → HTTP 400, code `MISSING_IDEMPOTENCY_KEY`.

---

## Context

### Beginning Context
- Empty Node.js project directory at `src/`
- PostgreSQL 15 database available via `DATABASE_URL`
- Redis instance available via `REDIS_URL`
- No existing models, routes, or middleware

### Ending Context

```
src/
  app.js                         # Express app factory (no listen — for testability)
  server.js                      # Entry point: imports app, calls app.listen
  config/
    database.js                  # Sequelize instance + testConnection()
  models/
    index.js                     # Sequelize model loader
    User.js
    Card.js
    Transaction.js
    AuditLog.js
    RefreshToken.js
    IdempotencyKey.js
  migrations/
    *-create-users.js
    *-create-cards.js
    *-create-transactions.js
    *-create-audit-logs.js
    *-create-refresh-tokens.js
    *-create-idempotency-keys.js
  middleware/
    auth.js                      # JWT verification, req.user population
    rbac.js                      # requireRole(...roles) factory
    validate.js                  # Joi schema validation factory
    requestId.js                 # UUID per request, X-Request-Id header
    idempotency.js               # Idempotency-Key check/store
    rateLimiter.js               # express-rate-limit instances
    errorHandler.js              # 4-arg Express error handler
  routes/
    auth.js
    cards.js
    transactions.js
    admin.js
  controllers/
    authController.js
    cardController.js
    transactionController.js
    adminController.js
  services/
    cardService.js
    transactionService.js
    auditService.js
    encryptionService.js
  schemas/
    authSchemas.js
    cardSchemas.js
    transactionSchemas.js
    adminSchemas.js
  utils/
    asyncHandler.js
    apiResponse.js
    ApiError.js
    cardGenerator.js
    jwt.js
tests/
  setup.js                       # DB connect, migrate, truncate hooks
  fixtures/
    factories.js                 # faker-based factory functions
  unit/
    encryptionService.test.js
    cardService.test.js
    auditService.test.js
    transactionService.test.js
    jwt.test.js
    cardGenerator.test.js
  integration/
    auth.test.js
    cards.test.js
    transactions.test.js
    admin.test.js
.sequelizerc
jest.config.js
package.json
.env.example
```

---

## Edge Cases and Failure Modes

| Scenario | Expected Behavior | Compliance Implication |
|----------|-------------------|----------------------|
| Freeze an already-frozen card | HTTP 422 `INVALID_STATE_TRANSITION`; no DB write, no audit entry | None — no state changed |
| Unfreeze an active card | HTTP 422 `INVALID_STATE_TRANSITION` | None |
| Close a card with PENDING transactions | HTTP 409 `CARD_HAS_PENDING_TRANSACTIONS`; card not closed | Audit entry records the rejected attempt |
| Create card when user already has 10 non-closed cards | HTTP 422 `MAX_CARDS_REACHED` | Audit entry records the rejected attempt |
| Set daily limit lower than current day's completed spend | HTTP 422 `LIMIT_BELOW_CURRENT_SPEND`; limit not updated | Audit entry records attempt + rejection reason |
| Transaction amount > per-transaction limit | Transaction created with status `DECLINED`, decline_reason `PER_TRANSACTION_LIMIT_EXCEEDED`; HTTP 200 returned (not an error) | Declined transaction recorded in audit log |
| Transaction would push daily spend over daily limit | Transaction `DECLINED`, decline_reason `DAILY_LIMIT_EXCEEDED` | Declined transaction recorded |
| Transaction on a FROZEN card | HTTP 422 `CARD_NOT_ACTIVE`; no transaction created | Audit entry records attempt |
| Duplicate POST with same `Idempotency-Key` | HTTP 201 with original response body; `X-Idempotency-Replay: true` header | Single audit entry (from original request only) |
| Same `Idempotency-Key` with different request body | HTTP 409 `IDEMPOTENCY_CONFLICT` | Conflict event logged |
| Expired access token | HTTP 401 `TOKEN_EXPIRED`; client must use refresh endpoint | Auth event logged; no resource-level audit entry |
| Replayed (revoked) refresh token | HTTP 401 `REFRESH_TOKEN_REUSED`; all refresh tokens for that user revoked immediately | Security event written to audit log with user_id |
| User requests another user's card ID | HTTP 404 (not 403 — prevents ID enumeration) | No audit entry for pure 404 |
| Malformed UUID in route parameter `:cardId` | HTTP 400 `INVALID_ID_FORMAT` before DB query | None |
| Missing `Idempotency-Key` on required endpoint | HTTP 400 `MISSING_IDEMPOTENCY_KEY` | None |
| Concurrent freeze + unfreeze on same card | Row-level lock serializes both; second request receives valid 422 `INVALID_STATE_TRANSITION` after first commits | Both requests produce audit entries with distinct timestamps |
| PAN encryption key rotation | Background migration re-encrypts rows; `encryption_key_version` column tracks key; dual-key lookup during migration window | Key rotation event logged at audit level |
| DB transaction failure mid-write | Full rollback; HTTP 500 returned; no partial state persisted | Failed operation logged at `error` level; no audit entry for incomplete action |
| Rate limit exceeded | HTTP 429 `RATE_LIMIT_EXCEEDED` with `Retry-After` and `X-RateLimit-*` headers | Rate limit events logged at `warn` level |
| `amount` field sent as number (not string) | HTTP 422 `VALIDATION_ERROR` — Joi schema requires string | None |
| Currency code not in ISO 4217 allowlist | HTTP 422 `VALIDATION_ERROR` | None |
| Audit log query window > 90 days | HTTP 422 `AUDIT_WINDOW_TOO_LARGE` | None |

---

## Verification

### Per Objective

| Objective | How to Verify |
|-----------|---------------|
| Card Lifecycle Management | Integration test: POST → GET assert PENDING → PATCH activate → PATCH freeze → PATCH unfreeze → DELETE → GET assert CLOSED. Assert HTTP status and `data.card.status` at each step. |
| Spending Limit Control | Unit test `cardService.checkSpendingLimits()`; integration test: set limits, fire transactions over/under each limit type, assert DECLINED status + correct `decline_reason`. |
| Transaction Visibility | Integration test: seed 25 transactions; GET page 1 returns 20 with `hasMore: true`; GET with cursor returns remaining 5 with `hasMore: false`; verify ordering by `created_at DESC`. |
| Compliance Audit Trail | After each card operation in integration tests, query `AuditLog` table directly and assert: correct `action`, `resource_id`, `actor_id`; `metadata` JSON contains no PAN-like strings. |
| Access Control | Integration test: user A token on user B's card → 404. User token on `/admin/*` → 403. Assert no API response contains `pan_encrypted` or unmasked PAN. |
| Idempotent Writes | Integration test: POST create card twice with same key → single DB row; second response identical to first + `X-Idempotency-Replay: true`. Same key, different body → 409. |

### Test Categories

**Unit tests** (no DB — mock Sequelize models):
- `encryptionService`: encrypt/decrypt round-trip, masking, invalid key error
- `cardGenerator`: format (16 digits), no collisions across 1000 calls
- `cardService.validateStateTransition()`: all valid and all invalid transitions
- `cardService.checkSpendingLimits()`: zero limits, null limits, boundary values
- `auditService.sanitizeMetadata()`: flat and nested PAN removal, CVV removal
- `auditService.log()`: does not throw when DB rejects (mock)
- `jwt.js`: sign/verify, expiry, invalid signature

**Integration tests** (real PostgreSQL via `DATABASE_URL_TEST`):
- Auth: register, login, refresh rotation, refresh replay attack, logout
- Cards: full lifecycle, cross-user denial, max-cards limit, all invalid transitions
- Transactions: pagination, all three limit types, declined transaction recording
- Admin: role enforcement, audit log query, date window enforcement, meta-audit entry
- Idempotency: replay success, conflict detection

**Coverage thresholds** (enforced via `jest.config.js` `coverageThreshold`):

| Metric | Threshold |
|--------|-----------|
| Statements | ≥ 80% |
| Branches | ≥ 75% |
| Functions | ≥ 80% |
| Lines | ≥ 80% |

---

## Low-Level Tasks

---

### Task 1: Initialize Project Structure

**Prompt**: Create the Node.js project skeleton with all dependencies, environment config, and Sequelize CLI setup.

**Files to CREATE**:
- `package.json`
- `.env.example`
- `.sequelizerc`
- `jest.config.js`
- `src/app.js`
- `src/server.js`
- `src/config/database.js`

**Details**:
- `package.json` dependencies: `express@^4`, `sequelize@^6`, `pg`, `pg-hstore`, `jsonwebtoken`, `bcryptjs`, `joi`, `express-rate-limit`, `rate-limit-redis`, `ioredis`, `winston`, `uuid`, `decimal.js`, `helmet`, `cors`
- devDependencies: `jest`, `supertest`, `sequelize-cli`, `dotenv`, `nodemon`, `@faker-js/faker`
- `src/app.js`: create and export Express app; mount `helmet()`, `cors()`, `express.json()`, `requestId` middleware; do NOT call `app.listen` here
- `src/config/database.js`: export Sequelize instance using `DATABASE_URL`; export async `testConnection()`
- `.sequelizerc`: set `models-path = src/models`, `migrations-path = src/migrations`, `seeders-path = src/seeders`, `config = src/config/database.js`
- `jest.config.js`: `testEnvironment: 'node'`, `globalSetup`/`globalTeardown` pointing to `tests/setup.js`, coverage thresholds as specified above

**Acceptance Criteria**:
- `npm install` completes without high/critical vulnerabilities
- `node src/server.js` starts on `PORT` without errors when `DATABASE_URL` is set
- `npx sequelize-cli db:migrate --env development` resolves config without error

---

### Task 2: User Model and Migration

**Prompt**: Create the User Sequelize model and migration. Users authenticate to access the API.

**Files to CREATE**:
- `src/models/User.js`
- `src/migrations/YYYYMMDDHHMMSS-create-users.js`

**Model fields**:
```
id            UUID, PK, defaultValue: UUIDV4
email         STRING(255), unique, not null
password_hash STRING(255), not null
role          ENUM('user','ops','compliance','admin'), default 'user'
is_deleted    BOOLEAN, default false
deleted_at    DATE, allowNull: true
createdAt     DATE (auto)
updatedAt     DATE (auto)
```

**Details**:
- `beforeCreate` + `beforeUpdate` hook: `email = email.toLowerCase().trim()`
- Instance method `verifyPassword(plaintext)` → `bcryptjs.compare(plaintext, this.password_hash)`
- `toJSON()` override: omit `password_hash` from serialized output
- Migration: add unique index on `email`; add index on `role`

**Acceptance Criteria**:
- `npx sequelize-cli db:migrate` creates `users` table with all columns and constraints
- `User.create({ email: 'TEST@Example.com', password_hash: '...' })` stores `test@example.com`
- Unit test: `verifyPassword('correct')` → true; `verifyPassword('wrong')` → false
- `JSON.stringify(user)` does not include `password_hash`

---

### Task 3: Card Model and Migration

**Prompt**: Create the Card Sequelize model with encrypted PAN storage, state machine, and spending limit fields.

**Files to CREATE**:
- `src/models/Card.js`
- `src/migrations/YYYYMMDDHHMMSS-create-cards.js`

**Model fields**:
```
id                   UUID, PK, UUIDV4
user_id              UUID, FK → users.id, not null
pan_encrypted        TEXT, not null
pan_last_four        CHAR(4), not null
expiry_month         SMALLINT (1–12), not null
expiry_year          SMALLINT, not null
status               ENUM('PENDING','ACTIVE','FROZEN','CLOSED'), default 'PENDING'
daily_limit          DECIMAL(15,2), allowNull: true
monthly_limit        DECIMAL(15,2), allowNull: true
per_transaction_limit DECIMAL(15,2), allowNull: true
currency             CHAR(3), default 'USD'
encryption_key_version SMALLINT, default 1
createdAt, updatedAt DATE (auto)
```

**Details**:
- `Card.belongsTo(User, { foreignKey: 'user_id' })`; `User.hasMany(Card, { foreignKey: 'user_id' })`
- Virtual getter `maskedPan`: returns `****-****-****-${this.pan_last_four}`
- `toJSON()` override: omit `pan_encrypted`; include `maskedPan`
- Migration: composite index on `(user_id, status)`; index on `user_id`

**Acceptance Criteria**:
- `card.maskedPan` returns `****-****-****-1234` for `pan_last_four = '1234'`
- `JSON.stringify(card)` does not include `pan_encrypted`
- `JSON.stringify(card)` includes `maskedPan`
- Migration creates column types matching spec (verify with `\d cards`)

---

### Task 4: Transaction Model and Migration

**Prompt**: Create the Transaction Sequelize model and migration optimized for paginated queries.

**Files to CREATE**:
- `src/models/Transaction.js`
- `src/migrations/YYYYMMDDHHMMSS-create-transactions.js`

**Model fields**:
```
id                    UUID, PK, UUIDV4
card_id               UUID, FK → cards.id, not null
amount                DECIMAL(15,2), not null
currency              CHAR(3), not null
merchant_name         STRING(255), not null
merchant_category_code CHAR(4), allowNull: true
status                ENUM('PENDING','COMPLETED','DECLINED','REVERSED'), not null
decline_reason        STRING(100), allowNull: true
idempotency_key       STRING(255), allowNull: true
created_at            DATE, not null (set explicitly — not auto-managed)
updatedAt             DATE (auto)
```

**Details**:
- `Transaction.belongsTo(Card, { foreignKey: 'card_id' })`; `Card.hasMany(Transaction, ...)`
- Migration: composite index on `(card_id, created_at DESC)`; partial unique index on `(card_id, idempotency_key)` where `idempotency_key IS NOT NULL`

**Acceptance Criteria**:
- Index on `(card_id, created_at DESC)` exists and is used by `EXPLAIN` for paginated queries
- Unique constraint on `(card_id, idempotency_key)` rejects duplicate keyed transactions
- `amount` stored and retrieved as string (Sequelize `DECIMAL` returns string — confirm no numeric coercion)

---

### Task 5: AuditLog, RefreshToken, and IdempotencyKey Models

**Prompt**: Create the remaining Sequelize models and migrations for audit logging, auth token storage, and idempotency tracking.

**Files to CREATE**:
- `src/models/AuditLog.js`
- `src/models/RefreshToken.js`
- `src/models/IdempotencyKey.js`
- `src/migrations/YYYYMMDDHHMMSS-create-audit-logs.js`
- `src/migrations/YYYYMMDDHHMMSS-create-refresh-tokens.js`
- `src/migrations/YYYYMMDDHHMMSS-create-idempotency-keys.js`

**AuditLog fields**:
```
id            UUID, PK, UUIDV4
actor_id      UUID, allowNull: true
actor_role    ENUM('user','ops','compliance','admin','system')
action        STRING(64), not null
resource_type STRING(32), not null
resource_id   UUID, not null
ip_address    STRING(45), allowNull: true
user_agent    STRING(512), allowNull: true
metadata      JSONB, allowNull: true
created_at    DATE, not null  ← no updatedAt column
```

**RefreshToken fields**:
```
id          UUID, PK, UUIDV4
user_id     UUID, FK → users.id
token_hash  STRING(255), not null
jti         UUID, not null, unique
expires_at  DATE, not null
revoked_at  DATE, allowNull: true
created_at  DATE
```

**IdempotencyKey fields**:
```
id                UUID, PK, UUIDV4
user_id           UUID, FK → users.id
idempotency_key   STRING(255), not null
request_body_hash STRING(64), not null
response_status   SMALLINT, not null
response_body     JSONB, not null
expires_at        DATE, not null
created_at        DATE
```

**Details**:
- `AuditLog`: override `AuditLog.update` class method to `throw new Error('AuditLog records are immutable')`
- `AuditLog`: no `updatedAt` column — set `timestamps: false` and manage `created_at` manually
- `AuditLog` migration: indexes on `(resource_id, created_at)`, `(actor_id, created_at)`, `action`
- `IdempotencyKey`: unique constraint on `(user_id, idempotency_key)`; index on `expires_at` for TTL cleanup
- `RefreshToken` migration: index on `(user_id, revoked_at)` for family revocation queries

**Acceptance Criteria**:
- `AuditLog.update({}, { where: {} })` throws `Error: AuditLog records are immutable`
- `AuditLog` table has no `updated_at` column in DB
- Inserting duplicate `(user_id, idempotency_key)` into `idempotency_keys` throws `UniqueConstraintError`

---

### Task 6: Encryption Service and Card Generator

**Prompt**: Create PAN encryption/decryption utilities and a cryptographically secure card number generator.

**Files to CREATE**:
- `src/services/encryptionService.js`
- `src/utils/cardGenerator.js`

**encryptionService.js exports**:
- `encrypt(plaintext)` → string in format `${iv_hex}:${tag_hex}:${ciphertext_hex}` using AES-256-GCM; key from `PAN_ENCRYPTION_KEY` env var (32-byte hex)
- `decrypt(stored)` → plaintext string; parses `iv:tag:ciphertext` format
- `maskPan(pan)` → `'****-****-****-' + pan.slice(-4)` (pan is 16-digit string without dashes)
- Key must be validated at module load: if not 64 hex chars, throw during startup

**cardGenerator.js exports**:
- `generateCardNumber()` → 16-digit string using `crypto.randomBytes(8).toString('hex').slice(0, 16)` pattern; returned without dashes
- `generateExpiry(yearsValid = 3)` → `{ month: number, year: number }` — month: current UTC month (1–12), year: current UTC year + yearsValid
- `generateCvv()` → 3-digit string via `crypto.randomInt(100, 999).toString()`

**Acceptance Criteria**:
- Unit test: `decrypt(encrypt('4111111111111111')) === '4111111111111111'`
- Unit test: `maskPan('4111111111111111')` → `'****-****-****-1111'`
- Unit test: process exits / throws at startup if `PAN_ENCRYPTION_KEY` is missing or not 64 hex chars
- Unit test: 1000 calls to `generateCardNumber()` return all 16-digit strings with no collisions
- Unit test: `generateCvv()` always returns 3-digit string

---

### Task 7: Audit Service

**Prompt**: Create the audit service that writes immutable audit entries with automatic PAN sanitization.

**Files to CREATE**:
- `src/services/auditService.js`

**Exports**:
```js
AUDIT_ACTIONS = {
  CARD_CREATED, CARD_ACTIVATED, CARD_FROZEN, CARD_UNFROZEN,
  CARD_CLOSED, CARD_LIMIT_UPDATED, TRANSACTION_COMPLETED,
  TRANSACTION_DECLINED, AUDIT_LOG_QUERIED, AUTH_LOGIN,
  AUTH_LOGOUT, AUTH_REFRESH_REPLAYED
}

sanitizeMetadata(obj)   // recursive PAN/CVV scrubber
log({ actorId, actorRole, action, resourceType, resourceId,
      ipAddress, userAgent, metadata })  // → AuditLog record
queryLogs({ actorId, resourceId, action, resourceType,
            startDate, endDate, page, pageSize })
```

**Details**:
- `sanitizeMetadata`: recursively walk object; delete any key matching `/pan|card_number|cvv|cvc|full_number/i`; return sanitized copy; handle arrays and nested objects
- `log()` always calls `sanitizeMetadata(metadata)` before write
- `log()` must never throw — on DB error, call `winston.error(...)` and return `null`
- `queryLogs`: enforces `pageSize` max 100; applies `startDate`/`endDate` as UTC range; returns `{ rows, count, page, pageSize }`

**Acceptance Criteria**:
- Unit test: `sanitizeMetadata({ pan: '4111', amount: '10.00' })` → `{ amount: '10.00' }`
- Unit test: `sanitizeMetadata({ card: { card_number: '...', type: 'visa' } })` → `{ card: { type: 'visa' } }`
- Unit test: `log(...)` does not throw when `AuditLog.create` rejects (mock it)
- Integration test: AuditLog row created after `cardService.createCard()` with correct `action` and no PAN in `metadata`

---

### Task 8: JWT Utilities and Auth Middleware

**Prompt**: Create JWT sign/verify utilities, auth middleware, and RBAC middleware.

**Files to CREATE**:
- `src/utils/jwt.js`
- `src/utils/ApiError.js`
- `src/middleware/auth.js`
- `src/middleware/rbac.js`

**jwt.js exports**:
- `signAccessToken({ userId, role })` → RS256 JWT, TTL 900s, payload `{ sub: userId, role, jti: randomUUID(), type: 'access' }`
- `signRefreshToken(userId)` → RS256 JWT, TTL 604800s, payload `{ sub: userId, jti: randomUUID(), type: 'refresh' }`
- `verifyAccessToken(token)` → decoded payload or throws `TokenExpiredError` / `JsonWebTokenError`
- `verifyRefreshToken(token)` → decoded payload or throws

**ApiError.js**: class extending `Error` with fields `statusCode`, `code`, `details`; used throughout the codebase

**auth.js middleware**:
- Extract `Authorization: Bearer <token>`; if missing → `next(new ApiError(401, 'MISSING_TOKEN'))`
- `verifyAccessToken(token)`; map errors to correct `ApiError` codes
- Attach `req.user = { id: payload.sub, role: payload.role }`

**rbac.js**:
- `requireRole(...roles)` → Express middleware; checks `req.user.role in roles`; on failure `next(new ApiError(403, 'INSUFFICIENT_PERMISSIONS'))`

**Acceptance Criteria**:
- Unit test: valid token → middleware calls `next()` with no args; `req.user` is set
- Unit test: expired token → `next(err)` with `err.code === 'TOKEN_EXPIRED'`
- Unit test: `requireRole('ops')` blocks `role = 'user'`; passes `role = 'ops'` and `role = 'admin'`
- Integration test: request without `Authorization` → HTTP 401

---

### Task 9: Request Validation, Idempotency, Rate Limiter, and Error Handler Middleware

**Prompt**: Create all remaining middleware: Joi validation factory, request ID, idempotency, rate limiting, and the global error handler.

**Files to CREATE**:
- `src/schemas/authSchemas.js`
- `src/schemas/cardSchemas.js`
- `src/middleware/validate.js`
- `src/middleware/requestId.js`
- `src/middleware/idempotency.js`
- `src/middleware/rateLimiter.js`
- `src/middleware/errorHandler.js`
- `src/utils/asyncHandler.js`
- `src/utils/apiResponse.js`

**validate.js**: `validate(schema, source = 'body')` → middleware factory; `source` is `'body' | 'query' | 'params'`; validation failure → `next(new ApiError(422, 'VALIDATION_ERROR', joiError.details))`

**requestId.js**: `req.requestId = randomUUID()`; `res.setHeader('X-Request-Id', req.requestId)`

**idempotency.js** (`requireIdempotency` middleware):
- Read `Idempotency-Key` header; if missing → `next(new ApiError(400, 'MISSING_IDEMPOTENCY_KEY'))`
- Compute `SHA-256(JSON.stringify(req.body))`
- Look up `IdempotencyKey` where `user_id = req.user.id` AND `idempotency_key = header` AND `expires_at > NOW()`
- If found and body hash matches: call `res.status(record.response_status).json(record.response_body)` with `X-Idempotency-Replay: true`; do not call `next()`
- If found and hash differs: `next(new ApiError(409, 'IDEMPOTENCY_CONFLICT'))`
- If not found: call `next()`; after response sent, store record in `IdempotencyKey` table (use `res.on('finish', ...)` hook)

**rateLimiter.js**: export three limiters (`writeLimit`, `readLimit`, `adminLimit`) using `express-rate-limit` with `rate-limit-redis` store; skip all limits when `NODE_ENV === 'test'`

**errorHandler.js** (4-arg): map `ApiError` → `{ error: { code, message, details } }` at correct status; Sequelize errors mapped as specified; `500` for unknowns; never include `stack` when `NODE_ENV === 'production'`

**apiResponse.js**: `success(res, data, statusCode = 200, meta = {})` and `created(res, data, meta = {})` helpers; always include `requestId` and ISO timestamp in `meta`

**Acceptance Criteria**:
- Unit test: `validate(schema)` with invalid body → `next` called with `ApiError(422, 'VALIDATION_ERROR')`
- Unit test: `errorHandler` returns correct shape for `ApiError`, Sequelize `ValidationError`, and unknown error
- Integration test: POST with valid idempotency key twice → second response has `X-Idempotency-Replay: true` and body matches first
- Integration test: same key, different body → 409 `IDEMPOTENCY_CONFLICT`
- Integration test: write endpoint 61st request in same minute → 429 (only outside `NODE_ENV=test`)

---

### Task 10: Auth Routes and Controller

**Prompt**: Implement register, login, token refresh, and logout endpoints.

**Files to CREATE**:
- `src/controllers/authController.js`
- `src/routes/auth.js`

**`POST /api/v1/auth/register`**
- Joi schema: `email` (valid email), `password` (min 8, ≥1 uppercase, ≥1 digit — via regex)
- Hash password with bcryptjs cost 12; create `User`; sign access + refresh tokens; store hashed refresh token in `RefreshToken`; respond 201 `{ data: { accessToken, refreshToken, user: { id, email, role } } }`

**`POST /api/v1/auth/login`**
- Find user by email; `verifyPassword()`; if fail (user not found OR wrong password) → 401 `INVALID_CREDENTIALS` (identical message for both cases)
- Sign tokens, store, respond 200

**`POST /api/v1/auth/refresh`**
- Joi: `{ refreshToken: string }`
- Verify JWT; find `RefreshToken` by `jti`; check not revoked and not expired
- If revoked: revoke all `RefreshToken` where `user_id = ?` (compromise) → 401 `REFRESH_TOKEN_REUSED`
- Else: revoke old record; issue new access + refresh pair; respond 200

**`POST /api/v1/auth/logout`**
- Requires `auth` middleware
- Revoke refresh token by `jti` (from request body `{ refreshToken }`); respond 204

**Acceptance Criteria**:
- Integration test: full register → login → refresh → logout cycle returns correct HTTP codes
- Integration test: login with wrong password and login with non-existent email return identical 401 body
- Integration test: after logout, using the same refresh token returns 401
- Integration test: replayed refresh token revokes family; subsequent refresh with new token also returns 401

---

### Task 11: Card Service

**Prompt**: Create the card service containing all business logic for card lifecycle operations.

**Files to CREATE**:
- `src/services/cardService.js`

**Exported functions**:
```
createCard(userId, { currency }, auditContext)
activateCard(cardId, userId, auditContext)
freezeCard(cardId, userId, auditContext)
unfreezeCard(cardId, userId, auditContext)
closeCard(cardId, userId, auditContext)
updateLimits(cardId, userId, { dailyLimit, monthlyLimit, perTransactionLimit }, auditContext)
getUserCards(userId, { status, page, pageSize })
getCardById(cardId, userId)
```

`auditContext = { ipAddress, userAgent, actorRole }` — threaded through from controller

**Details**:
- `createCard`: check max cards (`Card.count where status IN ['PENDING','ACTIVE','FROZEN'] AND user_id`); call `cardGenerator` + `encryptionService`; `Card.create`; `auditService.log(CARD_CREATED)`; return `{ card, cvv }` (CVV is the raw generated value, not stored)
- All state transitions: use `sequelize.transaction()` + `Card.findOne({ where: { id, user_id }, lock: true })` (FOR UPDATE); validate transition; update status; `auditService.log`
- `closeCard`: before transition, assert `Transaction.count({ where: { card_id, status: 'PENDING' } }) === 0`
- `updateLimits`: validate each limit is either `null` or a positive decimal string; amounts stored as strings; log `CARD_LIMIT_UPDATED` with sanitized old+new values in metadata (no PAN)
- `getCardById`: `Card.findOne({ where: { id: cardId, user_id: userId } })` — ownership enforced at query level; throw `ApiError(404, 'CARD_NOT_FOUND')` if null

**Acceptance Criteria**:
- Unit test: `freezeCard` on PENDING card → throws `ApiError(422, 'INVALID_STATE_TRANSITION')`
- Unit test: `createCard` when user has 10 non-closed cards → throws `ApiError(422, 'MAX_CARDS_REACHED')`
- Unit test: `closeCard` with 1 PENDING transaction → throws `ApiError(409, 'CARD_HAS_PENDING_TRANSACTIONS')`
- Unit test: `updateLimits` with negative amount → throws `ApiError(422, 'INVALID_LIMIT_VALUE')`
- Integration test: concurrent freeze + unfreeze (parallel Promises) ends in valid FROZEN or ACTIVE status with no DB corruption

---

### Task 12: Card Routes and Controller

**Prompt**: Wire up card service to Express routes with proper middleware chain.

**Files to CREATE**:
- `src/controllers/cardController.js`
- `src/routes/cards.js`

**Endpoint → Middleware chain**:
```
POST   /api/v1/cards                      auth, requireIdempotency, writeLimit, validate(createCardSchema), createCard
GET    /api/v1/cards                      auth, readLimit, validate(listCardsQuery, 'query'), listCards
GET    /api/v1/cards/:cardId              auth, readLimit, getCard
PATCH  /api/v1/cards/:cardId/activate    auth, writeLimit, activateCard
PATCH  /api/v1/cards/:cardId/freeze      auth, requireIdempotency, writeLimit, freezeCard
PATCH  /api/v1/cards/:cardId/unfreeze    auth, requireIdempotency, writeLimit, unfreezeCard
PATCH  /api/v1/cards/:cardId/limits      auth, writeLimit, validate(updateLimitsSchema), updateLimits
DELETE /api/v1/cards/:cardId             auth, writeLimit, closeCard
```

**Controller**: pass `auditContext` from `req` (extract `req.ip`, `req.get('User-Agent')`, `req.user.role`) to service calls.

**Response shapes**:
- Card object: `{ id, maskedPan, expiryMonth, expiryYear, status, currency, limits: { daily, monthly, perTransaction }, createdAt }`
- Card creation also includes `cvv` field (only on 201 response)

**Acceptance Criteria**:
- Integration test: POST → activate → freeze → unfreeze → DELETE — all return correct HTTP codes and `status` values
- Integration test: GET card response contains `maskedPan`, no `pan_encrypted`, no CVV
- Integration test: POST without `Idempotency-Key` → 400 `MISSING_IDEMPOTENCY_KEY`
- Integration test: user A JWT on user B's cardId → 404 `CARD_NOT_FOUND`
- Integration test: PATCH freeze on PENDING card → 422 `INVALID_STATE_TRANSITION`

---

### Task 13: Transaction Service and Routes

**Prompt**: Create transaction recording with spending limit enforcement and cursor-based paginated retrieval.

**Files to CREATE**:
- `src/services/transactionService.js`
- `src/controllers/transactionController.js`
- `src/routes/transactions.js`

**transactionService.js exports**:
- `recordTransaction(cardId, userId, { amount, currency, merchantName, merchantCategoryCode, idempotencyKey }, auditContext)`
  1. `getCardById(cardId, userId)` — ownership + existence check
  2. Assert card `status === 'ACTIVE'`; else throw `ApiError(422, 'CARD_NOT_ACTIVE')`
  3. Inside `sequelize.transaction()`:
     - Check `perTransactionLimit`: if `amount > limit` → create DECLINED transaction, return it (no throw)
     - Check `dailyLimit`: SUM of COMPLETED transactions from UTC midnight to now + amount
     - Check `monthlyLimit`: SUM of COMPLETED transactions from UTC month start to now + amount
     - All checks pass → create COMPLETED transaction
  4. `auditService.log` with action `TRANSACTION_COMPLETED` or `TRANSACTION_DECLINED`
- `getTransactions(cardId, userId, { status, startDate, endDate, cursor, pageSize })`
  - Ownership check; cursor decoded from base64 `JSON.stringify({ created_at, id })`; query `WHERE (created_at, id) < (cursor.created_at, cursor.id)`; return `{ transactions, nextCursor, hasMore }`
- `getTransactionById(transactionId, cardId, userId)` — ownership chain

**Endpoints**:
```
GET /api/v1/cards/:cardId/transactions           auth, readLimit, validate(query), listTransactions
GET /api/v1/cards/:cardId/transactions/:txId     auth, readLimit, getTransaction
```

**Acceptance Criteria**:
- Unit test: `recordTransaction` on FROZEN card → `ApiError(422, 'CARD_NOT_ACTIVE')`
- Unit test: amount > perTransactionLimit → returns DECLINED Transaction object (not error)
- Unit test: daily sum + amount > dailyLimit → returns DECLINED Transaction with `decline_reason: 'DAILY_LIMIT_EXCEEDED'`
- Integration test: seed 25 transactions; first page returns 20 with `hasMore: true`; cursor fetch returns 5 with `hasMore: false`; combined set equals original 25 in correct order
- Integration test: 3 completed transactions summing to daily limit → 4th transaction DECLINED

---

### Task 14: Admin / Compliance Routes

**Prompt**: Create ops/compliance endpoints for audit log queries and cross-user card oversight.

**Files to CREATE**:
- `src/controllers/adminController.js`
- `src/routes/admin.js`
- `src/schemas/adminSchemas.js`

**Endpoints** (all require `requireRole('ops', 'compliance', 'admin')`):

`GET /api/v1/admin/audit-logs`
- Joi query schema: `startDate` and `endDate` required; max window 90 days (enforce in schema); optional `actorId`, `resourceId`, `action`, `resourceType`, `page`, `pageSize`
- Calls `auditService.queryLogs()`
- Accessing this endpoint is itself logged: `auditService.log({ action: AUDIT_LOG_QUERIED, ... })`

`GET /api/v1/admin/cards` — paginated list of all cards across all users; same response shape as user card list

`GET /api/v1/admin/cards/:cardId` — card detail for any user; PAN still masked (no exceptions)

**All admin responses** include `X-Admin-Access: true` header.

**Acceptance Criteria**:
- Integration test: `user` role on `/admin/*` → 403 `INSUFFICIENT_PERMISSIONS`
- Integration test: audit log query with `endDate - startDate > 90 days` → 422 `AUDIT_WINDOW_TOO_LARGE`
- Integration test: compliance role queries audit logs → response includes `action`, `resource_id`, `created_at`
- Integration test: accessing `/admin/audit-logs` creates an `AUDIT_LOG_QUERIED` entry in `audit_logs` table
- Integration test: admin card detail response has `maskedPan`, no `pan_encrypted`

---

### Task 15: Unit and Integration Test Suites

**Prompt**: Create the complete Jest test suite covering all services and routes.

**Files to CREATE**:
- `tests/setup.js`
- `tests/fixtures/factories.js`
- `tests/unit/encryptionService.test.js`
- `tests/unit/cardService.test.js`
- `tests/unit/auditService.test.js`
- `tests/unit/transactionService.test.js`
- `tests/unit/jwt.test.js`
- `tests/unit/cardGenerator.test.js`
- `tests/integration/auth.test.js`
- `tests/integration/cards.test.js`
- `tests/integration/transactions.test.js`
- `tests/integration/admin.test.js`

**tests/setup.js**:
- `beforeAll`: run `sequelize.sync({ force: true })` against `DATABASE_URL_TEST`
- `beforeEach`: truncate all tables in dependency order (audit_logs, idempotency_keys, refresh_tokens, transactions, cards, users)
- `afterAll`: `sequelize.close()`

**tests/fixtures/factories.js**:
- `makeUser(overrides)` → creates User in DB; returns `{ user, plainPassword }`
- `makeCard(userId, overrides)` → creates Card in PENDING status; returns card
- `makeAccessToken(userId, role)` → signs access JWT; returns token string
- `makeTransaction(cardId, overrides)` → creates Transaction in DB; returns transaction

**Unit test patterns**: mock all Sequelize model methods; test service functions in isolation

**Integration test patterns**: use `supertest(app)` with real DB; seed data via factories

**Acceptance Criteria**:
- `npm test` exits 0 with no failures
- `npm test -- --coverage` meets all four thresholds (80/75/80/80)
- All unit tests run with no DB connection (confirm by running with `DATABASE_URL=invalid`)
- Full integration test suite completes in under 60 seconds
- Each integration test file cleans up its own data (via `beforeEach` truncate)
