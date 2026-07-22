# Banking Transactions API

> **Student Name**: Yevhen Kulinichenko AAI02
> **Date Submitted**: 13.05.2026
> **AI Tools Used**: Claude Code

A REST API for managing banking transactions built with ASP.NET Core (.NET 10). Supports creating transactions, querying with filters, and retrieving account balances with currency conversion. Storage is in-memory — no database required.

---

## Tech Stack

- **Runtime**: .NET 10
- **Framework**: ASP.NET Core Web API (controller-based)
- **Containerization**: Docker

---

## API Endpoints

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/transactions` | Create a new transaction |
| `GET` | `/transactions` | List all transactions (supports filters) |
| `GET` | `/transactions/:id` | Get a transaction by ID |

#### Query Filters for `GET /transactions`

| Parameter | Type | Description |
|-----------|------|-------------|
| `accountId` | string | Transactions where `fromAccount` or `toAccount` matches |
| `type` | string | `deposit`, `withdrawal`, or `transfer` |
| `from` | `YYYY-MM-DD` | Transactions on or after this date |
| `to` | `YYYY-MM-DD` | Transactions on or before this date |

All filters are optional and combinable.

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/accounts/:accountId/balance` | Current balance, optionally converted to another currency |
| `GET` | `/accounts/:accountId/summary` | Total deposits, withdrawals, transaction count, and most recent date |

---

## Transaction Model

```json
{
  "id": "3f2c1a...",
  "fromAccount": "ACC-12345",
  "toAccount": "ACC-67890",
  "amount": 100.50,
  "currency": "USD",
  "type": "transfer",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": "completed"
}
```

| Field | Type | Details |
|-------|------|---------|
| `id` | string | Auto-generated UUID |
| `fromAccount` | string | Format: `ACC-XXXXX` (5 alphanumeric chars) |
| `toAccount` | string | Format: `ACC-XXXXX` (5 alphanumeric chars) |
| `amount` | number | Positive, max 2 decimal places |
| `currency` | string | ISO 4217 code (USD, EUR, GBP, …) |
| `type` | string | `deposit`, `withdrawal`, `transfer` |
| `timestamp` | string | ISO 8601, set automatically on creation |
| `status` | string | `pending`, `completed`, `failed` |

---

## Validation

All fields are required. Validation errors are returned as:

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "amount", "message": "amount is required and must be a positive number" },
    { "field": "currency", "message": "Invalid currency code" }
  ]
}
```

---

## Balance Calculation

Balance is derived entirely from transaction history: each transaction credits `toAccount` and debits `fromAccount`. Since storage starts empty with no pre-funded state, **balances can go negative** — a balance of `-500 USD` simply means more has been sent from that account than received in the current session. Failed transactions are excluded from balance calculations.

The `/balance` endpoint accepts an optional `?currency=` parameter to convert the result to any supported ISO 4217 currency.

---

## Running the Application

See [HOWTORUN.md](./HOWTORUN.md) for full instructions. Quick start with Docker:

```bash
cd src
docker build -t banking-api .
docker run -d --name banking-api -p 8080:8080 banking-api
```

The API is available at `http://localhost:8080`.
