#!/usr/bin/env zsh
# Fetch Node.js binaries for macOS, Linux, and Windows and put in dist/bin
# Archives are cached in .node-cache for reuse

set -euo pipefail

NODE_VERSION="22.21.1"
BIN_DIR="../frontend/dist/bin"
CACHE_DIR=".node-cache"

mkdir -p "$BIN_DIR"
mkdir -p "$CACHE_DIR"

echo "Fetching Node.js v$NODE_VERSION for all platforms..."

# --- macOS ---
ARCH=$(uname -m)  # x86_64 or arm64
echo "Detected macOS architecture: $ARCH"
if [ "$ARCH" = "arm64" ]; then
    MAC_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz"
else
    MAC_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz"
fi
MAC_TAR="$CACHE_DIR/node-macos.tar.gz"
if [ ! -f "$MAC_TAR" ]; then
    echo "Downloading macOS Node..."
    curl -L "$MAC_URL" -o "$MAC_TAR"
fi

TEMP_DIR="$BIN_DIR/tmp-macos"
mkdir -p "$TEMP_DIR"
tar -xzf "$MAC_TAR" -C "$TEMP_DIR" --strip-components=1
mv "$TEMP_DIR/bin/node" "$BIN_DIR/node-macos"
rm -rf "$TEMP_DIR"

# --- Linux ---
LINUX_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
LINUX_TAR="$CACHE_DIR/node-linux.tar.xz"
if [ ! -f "$LINUX_TAR" ]; then
    echo "Downloading Linux Node..."
    curl -L "$LINUX_URL" -o "$LINUX_TAR"
fi

TEMP_DIR="$BIN_DIR/tmp-linux"
mkdir -p "$TEMP_DIR"
tar -xf "$LINUX_TAR" -C "$TEMP_DIR" --strip-components=1
mv "$TEMP_DIR/bin/node" "$BIN_DIR/node-linux"
rm -rf "$TEMP_DIR"

# --- Windows ---
WIN_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip"
WIN_ZIP="$CACHE_DIR/node-win.zip"
if [ ! -f "$WIN_ZIP" ]; then
    echo "Downloading Windows Node..."
    curl -L "$WIN_URL" -o "$WIN_ZIP"
fi

TEMP_DIR="$BIN_DIR/tmp-win"
mkdir -p "$TEMP_DIR"
unzip -q "$WIN_ZIP" -d "$TEMP_DIR"
mv "$TEMP_DIR/node-v${NODE_VERSION}-win-x64/node.exe" "$BIN_DIR/node-win.exe"
rm -rf "$TEMP_DIR"

echo "All Node binaries installed to $BIN_DIR"
echo "Archives are cached in $CACHE_DIR for future builds."