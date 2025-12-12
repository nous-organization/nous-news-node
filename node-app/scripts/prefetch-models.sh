#!/usr/bin/env bash
set -euo pipefail

# Find project root by searching upward for .git
find_project_root() {
  local dir
  dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.git" ]]; then
      echo "$dir"
      return
    fi
    dir="$(dirname "$dir")"
  done
  echo "❌ Could not find project root (.git)" >&2
  exit 1
}

BASE_DIR="$(find_project_root)"
MODEL_DIR="$BASE_DIR/.models/facebook"
mkdir -p "$MODEL_DIR"

# ----------------------------------------------
# Helper: pretty logging
# ----------------------------------------------
log() {
  echo -e "\033[1;32m$1\033[0m"
}

warn() {
  echo -e "\033[1;33m$1\033[0m"
}

error() {
  echo -e "\033[1;31m$1\033[0m" >&2
}

# ----------------------------------------------
# List of models to download
# Format: "repo_name repo_url"
# Add more models here as needed
# ----------------------------------------------
MODELS=(
  "m2m100_418M https://huggingface.co/facebook/m2m100_418M"
  "nllb-200-distilled-600M https://huggingface.co/facebook/nllb-200-distilled-600M"
)

# ----------------------------------------------
# Download / clone model function
# ----------------------------------------------
download_model() {
  local repo_name="$1"
  local repo_url="$2"
  local dest="$MODEL_DIR/$repo_name"

  if [ -d "$dest" ]; then
    log "$repo_name already exists, skipping."
    return
  fi

  log "-----------------------------------"
  log "Cloning $repo_name ..."

  # Ensure git-lfs is installed
  if ! command -v git-lfs &>/dev/null; then
    error "git-lfs is not installed. Please install git-lfs first."
    exit 1
  fi

  git lfs install --local || warn "git lfs install failed, continuing..."
  
  # Clone the repo
  git clone "$repo_url" "$dest" || error "Failed to clone $repo_name"

  # Remove .git folder to save space
  if [ -d "$dest/.git" ]; then
    log "Removing .git folder from $repo_name ..."
    rm -rf "$dest/.git"
  fi

  # ----------------------------------------------
  # Keep only Node.js needed files
  # ----------------------------------------------
  log "Keeping only Node.js required files for $repo_name ..."

  find "$dest" -type f ! \( \
      -iname "tokenizer*" -o \
      -iname "*vocab*" -o \
      -iname "*.json" -o \
      -iname "*.onnx" -o \
      -iname "*.bin" \
      \) -delete

  find "$dest" -type d -empty -delete

  log "$repo_name is ready in $dest"
}

# ----------------------------------------------
# Main loop
# ----------------------------------------------
for entry in "${MODELS[@]}"; do
  repo_name=$(echo "$entry" | awk '{print $1}')
  repo_url=$(echo "$entry" | awk '{print $2}')
  download_model "$repo_name" "$repo_url"
done

log "-----------------------------------"
log "All models downloaded and Node.js ready!"