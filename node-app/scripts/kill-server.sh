#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-9001}"
SCRIPT="/dist/setup.ts"

echo "🛑 Stopping P2P node server…"
echo "-------------------------------------"

#############################
# 1. Kill processes by script
#############################

# Get PIDs of node running the specific script
mapfile -t SCRIPT_PIDS < <(pgrep -f "node .*${SCRIPT}" || true)

if [[ ${#SCRIPT_PIDS[@]} -eq 0 ]]; then
    echo "ℹ️  No P2P node process found for $SCRIPT"
else
    echo "🔪 Killing P2P node PIDs: ${SCRIPT_PIDS[*]}"
    kill "${SCRIPT_PIDS[@]}" 2>/dev/null || kill -9 "${SCRIPT_PIDS[@]}" 2>/dev/null || true
fi

#####################################
# 2. Kill processes listening on port
#####################################

mapfile -t PORT_PIDS < <(
    lsof -t -iTCP:"$PORT" -sTCP:LISTEN -Pn 2>/dev/null || true
)

if [[ ${#PORT_PIDS[@]} -eq 0 ]]; then
    echo "ℹ️  No Node processes holding port $PORT"
else
    # Filter to only node processes
    NODE_PORT_PIDS=()
    for pid in "${PORT_PIDS[@]}"; do
        if ps -p "$pid" -o comm= | grep -q "^node$"; then
            NODE_PORT_PIDS+=("$pid")
        fi
    done

    if [[ ${#NODE_PORT_PIDS[@]} -gt 0 ]]; then
        echo "🔪 Killing Node processes on port $PORT: ${NODE_PORT_PIDS[*]}"
        kill "${NODE_PORT_PIDS[@]}" 2>/dev/null || kill -9 "${NODE_PORT_PIDS[@]}" 2>/dev/null || true
    else
        echo "ℹ️  Port $PORT is open,
