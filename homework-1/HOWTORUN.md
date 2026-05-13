# ▶️ How to Run the Application

Two options: **Docker** (no .NET required) or **local .NET CLI**.

> All commands below are run from the `src/` directory.

---

## Option 1: Docker

**Prerequisites:** [Docker](https://www.docker.com/products/docker-desktop) installed and running.

```bash
cd src

# 1. Build the image
docker build -t banking-api .

# 2. Run the container
docker run -d --name banking-api -p 8080:8080 banking-api
```

The API is available at `http://localhost:8080`.

---

## Option 2: Local .NET CLI

**Prerequisites:** [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) installed.

```bash
cd src

# 1. Restore dependencies
dotnet restore

# 2. Run the application
dotnet run
```

The API is available at `http://localhost:8080`.

---

## Verifying It Works

```bash
# Create a transaction
curl -X POST http://localhost:8080/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccount": "ACC-12345",
    "toAccount": "ACC-67890",
    "amount": 100.50,
    "currency": "USD",
    "type": "transfer"
  }'

# List all transactions
curl http://localhost:8080/transactions

# Get a transaction by ID (replace <id> with the id returned above)
curl http://localhost:8080/transactions/<id>
```

