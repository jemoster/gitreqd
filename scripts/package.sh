#!/usr/bin/env bash
# GRD-SYS-008: Build and package the tool for distribution.
# Produces installable .tgz artifacts in the release/ directory.
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

echo "Building gitreqd ..."
cd "${REPO_ROOT}"
npm install
npm run build

echo "Creating release directory: ${RELEASE_DIR}"
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

echo "Packaging @gitreqd/core ..."
cd "${REPO_ROOT}/packages/core"
npm pack --pack-destination "${RELEASE_DIR}"

echo "Packaging gitreqd CLI ..."
cd "${REPO_ROOT}/packages/cli"
npm pack --pack-destination "${RELEASE_DIR}"

echo "Done. Distribution artifacts:"
ls -la "${RELEASE_DIR}"/*.tgz
echo ""
echo "To install onto this host: ./scripts/install-gitreqd.sh ${RELEASE_DIR}"
echo "Or: npm install -g ${RELEASE_DIR}"/*.tgz
