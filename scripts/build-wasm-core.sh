#!/usr/bin/env bash
# Build gitreqd-wasm and emit wasm-bindgen bindings into packages/core/wasm.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${REPO_ROOT}/packages/core/wasm"
TARGET_DIR="${REPO_ROOT}/target/wasm32-unknown-unknown/release"
WASM_FILE="${TARGET_DIR}/gitreqd_wasm.wasm"

cd "${REPO_ROOT}"

if ! command -v rustup >/dev/null 2>&1; then
  echo "ERROR: rustup is required to build the WASM core."
  exit 1
fi
rustup target add wasm32-unknown-unknown >/dev/null

WASM_BINDGEN_VERSION="0.2.100"
if ! command -v wasm-bindgen >/dev/null 2>&1; then
  echo "ERROR: wasm-bindgen is not on PATH. Install wasm-bindgen-cli ${WASM_BINDGEN_VERSION}."
  exit 1
fi
actual="$(wasm-bindgen --version | awk '{print $NF}')"
if [ "${actual}" != "${WASM_BINDGEN_VERSION}" ]; then
  echo "ERROR: wasm-bindgen ${actual} does not match pinned ${WASM_BINDGEN_VERSION}."
  exit 1
fi

cargo build -p gitreqd-wasm --target wasm32-unknown-unknown --release
rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"
wasm-bindgen "${WASM_FILE}" \
  --out-dir "${OUT_DIR}" \
  --out-name gitreqd_wasm \
  --target nodejs \
  --typescript
