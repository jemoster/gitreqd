#!/usr/bin/env bash
# Build and install the gitreqd CLI so `gitreqd` can be run from anywhere.
# Usage: ./scripts/install-gitreqd.sh

set -euo pipefail

# Resolve repo root relative to this script (works from any cwd).
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Using repository root: ${REPO_ROOT}"

# Ensure Node and npm are available.
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not in PATH."
  echo "Install Node first (e.g. run scripts/install-node.sh) and then re-run this script."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not in PATH."
  echo "Install npm first (e.g. run scripts/install-npm.sh) and then re-run this script."
  exit 1
fi

echo "Installing npm dependencies in ${REPO_ROOT} ..."
cd "${REPO_ROOT}"
npm install

echo "Building gitreqd ..."
npm run build

echo "Linking gitreqd CLI globally via npm link ..."
cd "${REPO_ROOT}/packages/cli"
npm link

BIN_PATH="$(command -v gitreqd || true)"
if [ -n "${BIN_PATH}" ]; then
  echo "gitreqd is now available globally at: ${BIN_PATH}"
  echo "Example commands:"
  echo "  gitreqd validate"
  echo "  gitreqd html --project-dir /path/to/project --output ./out"
else
  echo "WARNING: gitreqd binary not found on PATH after npm link."
  echo "Check your npm global bin directory and ensure it is on PATH."
fi

