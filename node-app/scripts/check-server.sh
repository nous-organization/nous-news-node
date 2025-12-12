#!/usr/bin/env bash

PORT=${1:-9001}
SCRIPT="dist/setup.ts"

echo "🔍 Checking P2P Node server (port $PORT)…"
echo "-------------------------------------"

# 1. Check if your specific process is running
PIDS=$(pgrep -f "$SCRIPT")

if [ -z "$PIDS" ]; then
    echo "✅ P2P node process is NOT running"
else
    echo "⚠️ P2P node process running:"
    echo "$PIDS"
fi

echo ""

# 2. Check if port is in use by *your* node
PORT_HOLDER=$(lsof -iTCP:$PORT -sTCP:LISTEN -Pn | grep node)

if [ -z "$PORT_HOLDER" ]; then
    echo "✅ Port $PORT is free"
else
    echo "⚠️ Port $PORT is being used by your Node server:"
    echo "$PORT_HOLDER"
fi

echo ""
echo "✨ Done."