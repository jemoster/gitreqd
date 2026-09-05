#!/usr/bin/env bash
# Build and install the gitreqd CLI so `gitreqd` can be run from anywhere.
# Usage: ./scripts/install-gitreqd.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Using repository root: ${REPO_ROOT}"

if ! command -v cargo >/dev/null 2>&1; then
  echo "ERROR: cargo is not in PATH."
  echo "Install Rust (https://rustup.rs) and then re-run this script."
  exit 1
fi

echo "Installing gitreqd CLI from ${REPO_ROOT}/crates/gitreqd ..."
cargo install --path "${REPO_ROOT}/crates/gitreqd" --force

BIN_PATH="$(command -v gitreqd || true)"
if [ -n "${BIN_PATH}" ]; then
  echo "gitreqd is now available at: ${BIN_PATH}"
  echo "Example commands:"
  echo "  gitreqd validate"
  echo "  gitreqd html --project-dir /path/to/project --output ./out"
else
  echo "WARNING: gitreqd binary not found on PATH after cargo install."
  echo "Check that Cargo's bin directory (usually ~/.cargo/bin) is on PATH."
fi
