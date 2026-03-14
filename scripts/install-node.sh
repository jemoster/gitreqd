#!/usr/bin/env bash
# Install Node.js at a pinned version (latest as of 2026-02-23).
# Downloads the official binary from nodejs.org and installs to INSTALL_PREFIX.
# Usage: [INSTALL_PREFIX=/path] ./scripts/install-node.sh
#
# After install, appends the Node bin path to ~/.bashrc if not already present.

set -e

# Pinned Node.js version (from https://nodejs.org/dist/index.json, first entry = latest)
NODE_VERSION="v25.6.1"

INSTALL_PREFIX="${INSTALL_PREFIX:-$HOME/.local}"
INSTALL_DIR="${INSTALL_PREFIX}/node"
DIST="https://nodejs.org/dist"

# Detect OS and arch for tarball name
OS=$(uname -s)
ARCH=$(uname -m)

case "$OS" in
  Linux)  TARBALL_OS="linux" ;;
  Darwin) TARBALL_OS="darwin" ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64)      TARBALL_ARCH="x64" ;;
  aarch64|arm64) TARBALL_ARCH="arm64" ;;
  armv7l)      TARBALL_ARCH="armv7l" ;;
  *)
    echo "Unsupported arch: $ARCH"
    exit 1
    ;;
esac

TARBALL="node-${NODE_VERSION}-${TARBALL_OS}-${TARBALL_ARCH}.tar.xz"
URL="${DIST}/${NODE_VERSION}/${TARBALL}"

if command -v node >/dev/null 2>&1; then
  current=$(node -v 2>/dev/null || true)
  if [ "$current" = "$NODE_VERSION" ]; then
    echo "Node.js is already at ${NODE_VERSION}."
    exit 0
  fi
  echo "Current Node: ${current}. Installing ${NODE_VERSION} to ${INSTALL_DIR}."
fi

mkdir -p "${INSTALL_PREFIX}"
TMPDIR="${TMPDIR:-/tmp}"
TMPFILE="${TMPDIR}/${TARBALL}"

echo "Downloading ${URL} ..."
if command -v curl >/dev/null 2>&1; then
  curl -fsSL -o "$TMPFILE" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -q -O "$TMPFILE" "$URL"
else
  echo "Need curl or wget to download."
  exit 1
fi

echo "Extracting to ${INSTALL_DIR} ..."
rm -rf "${INSTALL_DIR}"
mkdir -p "${INSTALL_DIR}"
tar -xJf "$TMPFILE" -C "${INSTALL_DIR}" --strip-components=1
rm -f "$TMPFILE"

echo "Done. Node.js ${NODE_VERSION} installed to ${INSTALL_DIR}"

# Update ~/.bashrc if this install dir's bin is not already in PATH there
BASHRC="${HOME}/.bashrc"
PATH_LINE="export PATH=\"${INSTALL_DIR}/bin:\$PATH\""
MARKER="# Node.js (install-node.sh)"
if [ -f "$BASHRC" ]; then
  if grep -q "${INSTALL_DIR}/bin" "$BASHRC" 2>/dev/null; then
    echo "PATH already includes ${INSTALL_DIR}/bin in ~/.bashrc"
  else
    echo "" >> "$BASHRC"
    echo "$MARKER" >> "$BASHRC"
    echo "$PATH_LINE" >> "$BASHRC"
    echo "Updated ~/.bashrc with PATH. Run: source ~/.bashrc   (or open a new shell)"
  fi
else
  echo "Add to your PATH: $PATH_LINE"
fi
echo "Verify: node -v   # should show ${NODE_VERSION}"
