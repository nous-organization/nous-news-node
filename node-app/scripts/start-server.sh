#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------
# Resolve BASE_DIR = node-app root directory
# ---------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Safety check
if [ ! -f "$BASE_DIR/package.json" ]; then
  echo "❌ ERROR: Could not locate package.json in $BASE_DIR"
  echo "This script must be located in node-app/scripts"
  exit 1
fi

# ---------------------------------------------------
# Directory setup
# ---------------------------------------------------
NODE_VERSION="22.21.1"
BIN_DIR="$BASE_DIR/dist/bin"
CACHE_DIR="$BASE_DIR/.cache/node-fetch"

mkdir -p "$BIN_DIR" "$CACHE_DIR"

echo "📦 Fetching Node.js v$NODE_VERSION for macOS, Linux, and Windows..."
echo "→ Output directory: $BIN_DIR"
echo "→ Cache directory:  $CACHE_DIR"
echo ""

# ---------------------------------------------------
# macOS build
# ---------------------------------------------------
ARCH="$(uname -m)"
echo "🍎 Detected architecture: $ARCH"

if [ "$ARCH" = "arm64" ]; then
    MAC_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz"
else
    MAC_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz"
fi

MAC_TAR="$CACHE_DIR/node-mac.tar.gz"

if [ ! -f "$MAC_TAR" ]; then
    echo "⬇️  Downloading macOS Node..."
    curl -L "$MAC_URL" -o "$MAC_TAR"
fi

TEMP_DIR="$BIN_DIR/tmp-mac"
mkdir -p "$TEMP_DIR"

tar -xzf "$MAC_TAR" -C "$TEMP_DIR" --strip-components=1
mv "$TEMP_DIR/bin/node" "$BIN_DIR/node-macos"
rm -rf "$TEMP_DIR"

echo "✔ macOS binary installed: node-macos"

# ---------------------------------------------------
# Linux build
# ---------------------------------------------------
LINUX_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
LINUX_TAR="$CACHE_DIR/node-linux.tar.xz"

if [ ! -f "$LINUX_TAR" ]; then
    echo "⬇️  Downloading Linux Node..."
    curl -L "$LINUX_URL" -o "$LINUX_TAR"
fi

TEMP_DIR="$BIN_DIR/tmp-linux"
mkdir -p "$TEMP_DIR"

tar -xf "$LINUX_TAR" -C "$TEMP_DIR" --strip-components=1
mv "$TEMP_DIR/bin/node" "$BIN_DIR/node-linux"
rm -rf "$TEMP_DIR"

echo "✔ Linux binary installed: node-linux"

# ---------------------------------------------------
# Windows build
# ---------------------------------------------------
WIN_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip"
WIN_ZIP="$CACHE_DIR/node-win.zip"

if [ ! -f "$WIN_ZIP" ]; then
    echo "⬇️  Downloading Windows Node..."
    curl -L "$WIN_URL" -o "$WIN_ZIP"
fi

TEMP_DIR="$BIN_DIR/tmp-win"
mkdir -p "$TEMP_DIR"

unzip -q "$WIN_ZIP" -d "$TEMP_DIR"
mv "$TEMP_DIR/node-v${NODE_VERSION}-win-x64/node.exe" "$BIN_DIR/node-win.exe"
rm -rf "$TEMP_DIR"

echo "✔ Windows binary installed: node-win.exe"

# ---------------------------------------------------
echo ""
echo "🎉 All Node binaries installed into:"
echo "   $BIN_DIR"
echo ""
echo "📦 Archives cached for future builds in:"
echo "   $CACHE_DIR"
