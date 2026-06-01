# Homework 3 — Specification-Driven Design

> **Student Name**: Yevhen Kulinichenko AAI02
> **Date Submitted**: 01.06.2026
> **AI Tools Used**: Claude Code

---

## Summary

This submission specifies a RESTful API for managing virtual payment cards in a regulated FinTech environment. The chosen domain — virtual card issuance and lifecycle — is representative of real-world card-as-a-service platforms and covers a rich set of compliance concerns (PAN encryption, audit trails, spending limits) within a manageable scope.

The deliverables are:

| File | Purpose |
|------|---------|
| `specification.md` | Layered product spec: objectives → policy → implementation notes → context → edge cases → verification → 15 low-level tasks |
| `agents.md` | AI coding agent rules: domain constraints, code style, testing expectations, security defaults |
| `CLAUDE.md` | Claude Code project rules: concise hard rules for the implementation session |
| `README.md` | This file |

The implementation target stack is **Node.js + Express.js + Sequelize.js + PostgreSQL**, chosen for their ubiquity in FinTech backend services and strong Sequelize support for PostgreSQL-specific features (DECIMAL types, JSONB, row-level locking).

---

## Rationale

### Why Virtual Card Lifecycle?

Virtual card management is a self-contained domain with clear state transitions, real compliance requirements (PCI-DSS PAN handling, audit retention), and a natural multi-stakeholder model (end-users + compliance officers). This made it ideal for demonstrating layered specification: the user-facing goals (freeze a card, see transactions) are distinct from the compliance goals (immutable audit trail, no PAN leakage), which are distinct from the engineering constraints (idempotent writes, row-level locks).

### How Performance Targets Were Chosen

Targets in `specification.md` (§ Non-Functional Requirements) are labeled "assumed targets" because this is a hypothetical system. The numbers are grounded in:

- **FinTech UX expectations**: freeze/unfreeze operations feel instant when under 150ms p95; slower responses create user anxiety that the card is still active.
- **Single-region PostgreSQL**: a simple indexed PK lookup on a warm connection pool completes in 5–20ms; adding encryption, audit writes, and DB transaction overhead puts the realistic p95 at 150–250ms for writes.
- **Compliance query latency**: audit log queries are staff-facing, not customer-facing, so 400–700ms p95 is acceptable — generous enough to allow broader date-range scans without full-table pressure.

### Why Cursor-Based Pagination for Transactions?

Offset-based pagination on a `transactions` table with concurrent inserts causes rows to shift between pages (insert shifts offsets). Cursor-based pagination on `(created_at DESC, id)` is stable and uses the composite index efficiently. Audit log queries use offset pagination because compliance staff run them interactively against bounded date ranges with lower concurrency.

### Why RS256 for JWT?

Symmetric HS256 requires every service that validates tokens to know the signing secret — a PCI concern. RS256 lets the auth service sign with the private key and any downstream service verify with the public key only. This is standard in payment infrastructure.

### Why Idempotency for State-Change PATCHes?

Card freeze and unfreeze can be triggered by mobile clients on unreliable networks. Without idempotency, a timeout followed by a retry could freeze a card twice (resulting in an erroneous double-audit entry and confusing the user). Idempotency keys guarantee exactly-once semantics from the client's perspective.

---

## Industry Best Practices and Where They Appear

| Practice | Where in Spec |
|----------|--------------|
| **PAN encryption at rest (AES-256-GCM)** | Implementation Notes § Security; Task 6 (encryptionService); `agents.md` Hard Rules; `CLAUDE.md` Hard Rules |
| **CVV never stored** | Mid-Level Objective 5; Card Model (Task 3); Task 6; `agents.md` Domain Rules |
| **PAN masked in all API responses** | Non-Functional § Privacy & Compliance; Card Model toJSON() (Task 3); `CLAUDE.md` Hard Rules |
| **Immutable audit log** | Mid-Level Objective 4; Task 5 (AuditLog model — override update); Task 7 (auditService); `agents.md` § Audit Trail |
| **7-year audit retention** | Non-Functional § Privacy & Compliance |
| **Refresh token family rotation (compromise detection)** | Task 8 (jwt.js); Task 10 (refresh endpoint); `agents.md` § Security |
| **Row-level locking for concurrent state transitions** | Non-Functional § Reliability; Task 11 (cardService); `agents.md` Edge Cases |
| **Idempotency keys for write operations** | Mid-Level Objective 6; Implementation Notes § Idempotency; Tasks 9, 12, 13 |
| **IDOR prevention via query-level ownership check** | Implementation Notes § Error Handling; Task 11 (getCardById); `agents.md` § Access Control; `CLAUDE.md` Hard Rules |
| **Rate limiting with Redis backing** | Non-Functional § Rate Limiting; Task 9 (rateLimiter); `agents.md` |
| **GDPR tombstoning** | Non-Functional § Privacy & Compliance |
| **No enumeration on 403 → 404** | Edge Cases table; `agents.md` § Access Control; `CLAUDE.md` Hard Rules |
| **Bcrypt cost ≥ 12** | Implementation Notes § Security; Task 8; `agents.md`; `CLAUDE.md` |
| **Decimal arithmetic for money** | Implementation Notes § Money Handling; `agents.md`; `CLAUDE.md` |
| **Structured JSON logging (no PAN in logs)** | Implementation Notes § Technology Stack; `agents.md` § PAN and Sensitive Data |
| **Coverage thresholds enforced in CI** | Verification § Test Categories; Task 1 (jest.config.js); `agents.md` § Testing |
