#!/usr/bin/env bash
# Install the pinned wasm-bindgen-cli used by scripts/build-wasm-core.sh.
set -euo pipefail

VERSION="${WASM_BINDGEN_VERSION:-0.2.100}"

if command -v wasm-bindgen >/dev/null 2>&1; then
  actual="$(wasm-bindgen --version | awk '{print $NF}')"
  if [ "${actual}" = "${VERSION}" ]; then
    exit 0
  fi
fi

if command -v cargo >/dev/null 2>&1; then
  cargo install wasm-bindgen-cli --version "${VERSION}" --force
  exit 0
fi

echo "ERROR: cargo is required to install wasm-bindgen-cli ${VERSION}."
exit 1
