#!/bin/bash
set -e

# ----------------------------------------------
# Base directory of the repository (script root)
# ----------------------------------------------
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ----------------------------------------------
# Helper: pretty logging
# ----------------------------------------------
log() {
  echo -e "\033[1;32m$1\033[0m"
}

# ----------------------------------------------
# Cleanup functions
# ----------------------------------------------
clean_orbit() {
  log "🧹 Cleaning OrbitDB and Helia stores..."
  rm -rf "$BASE_DIR/.nous/orbitdb-databases/"*
  rm -rf "$BASE_DIR/.nous/orbitdb-keystore/"*
  rm -rf "$BASE_DIR/.nous/helia-blocks/"*
  log "✔ Orbit cleanup complete."
}

clean_backend_dist() {
  log "🧹 Cleaning backend dist/..."
  rm -rf "$BASE_DIR/dist"
  log "✔ Backend dist cleaned."
}

clean_build_folder() {
  log "🧹 Cleaning build folder (keeping PNGs)..."
  find "$BASE_DIR/build" -type f ! -name "*.png" -delete
  find "$BASE_DIR/build" -type d -empty -delete
  rm -rf "$BASE_DIR/build/bin" "$BASE_DIR/build/darwin"
  log "✔ Build folder cleaned."
}

# ----------------------------------------------
# Usage
# ----------------------------------------------
usage() {
  echo "Usage: ./clean.sh [all|orbit|backend|frontend|build]"
  echo ""
  echo "  all        Clean everything"
  echo "  orbit      Clean OrbitDB, keystore, Helia"
  echo "  backend    Clean dist"
  echo "  build      Clean build folder (keep PNGs)"
  echo ""
  echo "If no argument is given, defaults to cleaning: orbit + backend"
}

# ----------------------------------------------
# Main logic
# ----------------------------------------------
COMMAND="$1"

case "$COMMAND" in
  all)
    clean_orbit
    clean_backend_dist
    # clean_build_folder
    log "✨ All cleanup complete."
    ;;
  orbit)
    clean_orbit
    ;;
  backend)
    clean_backend_dist
    ;;
  build)
    clean_build_folder
    ;;
  "")
    log "⚠ No command given — defaulting to cleaning orbit + backend."
    clean_orbit
    clean_backend_dist
    log "✨ Default cleanup complete."
    ;;
  *)
    log "❌ Unknown command: $COMMAND"
    usage
    exit 1
    ;;
esac