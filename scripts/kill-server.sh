#!/usr/bin/env bash

PORT=${1:-9001}
SCRIPT="/dist/setup.ts"

echo "🛑 Stopping P2P node server…"
echo "-------------------------------------"

# Kill Node processes running the P2P script
PIDS=$(pgrep -f "$SCRIPT")

if [ -z "$PIDS" ]; then
    echo "ℹ️  No P2P node process found"
else
    echo "🔪 Killing P2P node PIDs: $PIDS"
    kill -9 $PIDS
fi

# Kill Node processes listening on the P2P port (extra safety)
PORT_PIDS=$(lsof -t -iTCP:$PORT -sTCP:LISTEN -Pn | xargs -I{} ps -p {} -o pid=,comm= | grep node | awk '{print $1}')

if [ ! -z "$PORT_PIDS" ]; then
    echo "🔪 Killing Node processes on port $PORT: $PORT_PIDS"
    kill -9 $PORT_PIDS
else
    echo "ℹ️  No Node processes holding port $PORT"
fi

echo ""
echo "✨ Cleanup finished."