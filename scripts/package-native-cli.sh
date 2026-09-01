#!/usr/bin/env bash
# GRD-CLI-009 / GRD-SYS-008: Build the native gitreqd CLI binary for Linux x86_64.
# Writes release/gitreqd-linux-x86_64.
# Usage: ./scripts/package-native-cli.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="${REPO_ROOT}/release"
ASSET_NAME="gitreqd-linux-x86_64"
REQUIRED_HOST="x86_64-unknown-linux-gnu"

if ! command -v rustc >/dev/null 2>&1 || ! command -v cargo >/dev/null 2>&1; then
  echo "ERROR: rustc and cargo must be in PATH. Install Rust first, then re-run this script."
  exit 1
fi

HOST="$(rustc -vV | awk '/^host:/{print $2}')"
if [[ "${HOST}" != "${REQUIRED_HOST}" ]]; then
  echo "ERROR: Native CLI packaging requires Linux x86_64 (rustc host is ${HOST})."
  exit 1
fi

echo "Building gitreqd native CLI (${REQUIRED_HOST}, release) ..."
cd "${REPO_ROOT}"
cargo build --release -p gitreqd

BIN="${REPO_ROOT}/target/release/gitreqd"
if [[ ! -f "${BIN}" ]]; then
  echo "ERROR: Expected binary not found: ${BIN}"
  exit 1
fi

mkdir -p "${RELEASE_DIR}"
ASSET="${RELEASE_DIR}/${ASSET_NAME}"
cp "${BIN}" "${ASSET}"
chmod +x "${ASSET}"
if command -v strip >/dev/null 2>&1; then
  strip "${ASSET}" || true
fi

echo "Done. Native CLI artifact: ${ASSET}"
ls -la "${ASSET}"
echo ""
echo "To install onto this host: cp ${ASSET} /usr/local/bin/gitreqd"
