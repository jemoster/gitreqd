#!/usr/bin/env bash
# Build gitreqd-wasm and emit wasm-bindgen bindings for Node and the browser.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_OUT="${REPO_ROOT}/packages/core/wasm"
WEB_OUT="${REPO_ROOT}/packages/core/wasm-web"
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

rm -rf "${NODE_OUT}" "${WEB_OUT}"
mkdir -p "${NODE_OUT}" "${WEB_OUT}"

wasm-bindgen "${WASM_FILE}" \
  --out-dir "${NODE_OUT}" \
  --out-name gitreqd_wasm \
  --target nodejs \
  --typescript

# wasm-bindgen Node glue is CommonJS. Isolate it from packages/core "type": "module".
printf '%s\n' '{ "type": "commonjs" }' > "${NODE_OUT}/package.json"

# Browser glue (--target web) has no Node builtins; instantiate with initGitreqdWasm().
wasm-bindgen "${WASM_FILE}" \
  --out-dir "${WEB_OUT}" \
  --out-name gitreqd_wasm \
  --target web \
  --typescript
