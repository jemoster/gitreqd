#!/usr/bin/env bash
# Install npm
# Requires Node.js to be installed (npm is bundled with Node).
# Usage: ./scripts/install-npm.sh   or   bash scripts/install-npm.sh

set -e

# Pinned npm version (from https://registry.npmjs.org/npm/latest)
NPM_VERSION="11.10.1"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not in PATH. Install Node first (e.g. from https://nodejs.org or via nvm/fnm), then run this script again."
  exit 1
fi

if command -v npm >/dev/null 2>&1; then
  current=$(npm -v 2>/dev/null || true)
  if [ "$current" = "$NPM_VERSION" ]; then
    echo "npm is already at ${NPM_VERSION}."
    exit 0
  fi
  echo "Installing npm@${NPM_VERSION} (current: ${current:-unknown})..."
  npm install -g "npm@${NPM_VERSION}"
  echo "Done. npm version: $(npm -v)"

  # Ensure the global npm bin directory is on PATH for future shells.
  # Newer npm versions deprecate `npm bin`; derive it from `npm config get prefix`.
  NPM_PREFIX="$(npm config get prefix 2>/dev/null || true)"
  if [ -n "$NPM_PREFIX" ]; then
    NPM_BIN_DIR="${NPM_PREFIX}/bin"
  else
    NPM_BIN_DIR=""
  fi

  if [ -n "$NPM_BIN_DIR" ] && [ -d "$NPM_BIN_DIR" ]; then
    BASHRC="${HOME}/.bashrc"
    PATH_LINE="export PATH=\"${NPM_BIN_DIR}:\$PATH\""
    MARKER="# npm global bin (install-npm.sh)"
    if [ -f "$BASHRC" ]; then
      if grep -q "${NPM_BIN_DIR}" "$BASHRC" 2>/dev/null; then
        echo "PATH already includes ${NPM_BIN_DIR} in ~/.bashrc"
      else
        echo "" >> "$BASHRC"
        echo "$MARKER" >> "$BASHRC"
        echo "$PATH_LINE" >> "$BASHRC"
        echo "Updated ~/.bashrc with npm global bin. Run: source ~/.bashrc   (or open a new shell)"
      fi
    else
      echo "Add to your PATH for future shells: $PATH_LINE"
    fi
  else
    echo "Warning: could not determine npm global bin directory (npm config get prefix)."
  fi
else
  echo "npm not found in PATH. Install Node.js (which includes npm) from https://nodejs.org or via nvm/fnm, then run this script to pin npm to ${NPM_VERSION}."
  exit 1
fi
