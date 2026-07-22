# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Banking Transactions REST API — Homework 1 from a GenAI for Software Engineering course. Built with **ASP.NET Core Web API (.NET 10)**, in-memory storage, containerized with Docker. Runs on port **8080**.

## Running the Application

```bash
# Docker
cd src
docker build -t banking-api .
docker run -d --name banking-api -p 8080:8080 banking-api

# Local
cd src
dotnet restore && dotnet run
```

See `HOWTORUN.md` for full instructions and sample `curl` calls.

## Architecture

```
src/
├── Controllers/   — TransactionsController, AccountsController
├── Models/        — Transaction, CreateTransactionRequest, response DTOs
├── Validators/    — TransactionValidator (static, returns List<FieldError>)
└── Services/      — TransactionStore (singleton List<Transaction>), CurrencyConverter
```

**Key decisions:**
- Type and status are plain strings validated in `TransactionValidator`, not enums.
- `CurrencyConverter` converts via USD as intermediate; ~50 currencies supported.
- Failed transactions are excluded from balance calculations.
- Balances can go negative — no pre-funded state, storage starts empty each run.

## Validation Error Shape

```json
{
  "error": "Validation failed",
  "details": [{ "field": "amount", "message": "amount is required and must be a positive number" }]
}
```

## Repository Layout

```
homework-1/
├── README.md
├── HOWTORUN.md
├── src/                  — application source
├── demo/                 — run-docker.sh, run-local.sh, sample-requests.http
└── docs/screenshots/     — images
```
