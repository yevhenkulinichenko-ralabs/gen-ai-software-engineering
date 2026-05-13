#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src"

echo "Restoring dependencies..."
dotnet restore "$SRC_DIR"

echo "Starting application on http://localhost:8080"
dotnet run --project "$SRC_DIR"
