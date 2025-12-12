#!/usr/bin/env bash
set -e

# Make sure script is executable
chmod +x docker-compose.yml

# Start Node + Python backend in Docker
docker compose -f docker-compose.yml up --build
