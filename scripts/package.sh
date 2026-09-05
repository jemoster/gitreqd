#!/usr/bin/env bash
# GRD-SYS-008: Build and package @gitreqd/core for distribution.
# Produces gitreqd-core-X.Y.Z.tgz in the release/ directory.
# Usage: ./scripts/package.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="${REPO_ROOT}/release"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not in PATH. Install Node first, then re-run this script."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not in PATH. Install npm first, then re-run this script."
  exit 1
fi

echo "Building @gitreqd/core (WASM facade) ..."
cd "${REPO_ROOT}"
npm install
npm run build -w @gitreqd/core

echo "Creating release directory: ${RELEASE_DIR}"
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

echo "Packaging @gitreqd/core ..."
cd "${REPO_ROOT}/packages/core"
npm pack --pack-destination "${RELEASE_DIR}"

echo "Done. Distribution artifacts:"
ls -la "${RELEASE_DIR}"/*.tgz
echo ""
echo "The native gitreqd CLI is a Rust binary. Build it with:"
echo "  ./scripts/package-native-cli.sh"
echo "or: cargo install --path crates/gitreqd"
