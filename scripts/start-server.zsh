#!/usr/bin/env zsh
set -euo pipefail

# ---------------------------------------
# Remove Volta so node=22 is used
# ---------------------------------------
export PATH=$(echo "$PATH" | tr ':' '\n' | grep -v '/.volta/bin' | paste -sd ':' -)

# Load NVM so we get Node 22
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 22

echo "Script node: $(node -v)"
which node

# ---------------------------------------
# Compute paths
# ---------------------------------------

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 Starting Nous P2P Node (development)..."
cd "$BASE_DIR"

# ---------------------------------------
# Export ENV VARS (recommended way)
# ---------------------------------------

export IDENTITY_ID="nous-node"
export ORBITDB_KEYSTORE_PATH="$BASE_DIR/.nous/orbitdb-keystore"
export ORBITDB_DB_PATH="$BASE_DIR/.nous/orbitdb-databases"
export BLOCKSTORE_PATH="$BASE_DIR/.nous/helia-blockstore"

# Confirm
echo "🌱 ENV:"
echo "  IDENTITY_ID=$IDENTITY_ID"
echo "  ORBITDB_KEYSTORE_PATH=$ORBITDB_KEYSTORE_PATH"
echo "  ORBITDB_DB_PATH=$ORBITDB_DB_PATH"
echo "  BLOCKSTORE_PATH=$BLOCKSTORE_PATH"

# ---------------------------------------
# Run TSX WATCH with env inherited
# ---------------------------------------

npx tsx watch \
  --tsconfig "./tsconfig.json" \
  --watch-path "./src" \
  "./src/setup.ts"