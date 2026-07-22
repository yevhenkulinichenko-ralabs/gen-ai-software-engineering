#!/usr/bin/env bash
# Builds the Banking Transactions API Docker image and starts the container.
# Stops and removes any previously running container before starting a fresh one.
# The API will be available at http://localhost:8080 after startup.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src"
IMAGE_NAME="banking-api"
CONTAINER_NAME="banking-api"

# Stop and remove the existing container if it is running or stopped
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Stopping and removing existing container '$CONTAINER_NAME'..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME"
fi

# Build a fresh image from source
echo "Building Docker image '$IMAGE_NAME'..."
docker build -t "$IMAGE_NAME" "$SRC_DIR"

# Start the container and expose the API on port 8080
echo "Starting container '$CONTAINER_NAME' on http://localhost:8080"
docker run -d --name "$CONTAINER_NAME" -p 8080:8080 "$IMAGE_NAME"
