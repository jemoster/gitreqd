#!/usr/bin/env bash
# Install the pinned wasm-bindgen-cli used by scripts/build-wasm-core.sh.
# Prefers the official GitHub release binary so CI does not compile the CLI
# against a newer Cargo edition than the repo toolchain.
set -euo pipefail

VERSION="${WASM_BINDGEN_VERSION:-0.2.100}"

if command -v wasm-bindgen >/dev/null 2>&1; then
  actual="$(wasm-bindgen --version | awk '{print $NF}')"
  if [ "${actual}" = "${VERSION}" ]; then
    exit 0
  fi
fi

install_dir="${CARGO_HOME:-${HOME}/.cargo}/bin"
mkdir -p "${install_dir}"

os="$(uname -s)"
arch="$(uname -m)"
case "${os}-${arch}" in
  Linux-x86_64) triple="x86_64-unknown-linux-musl" ;;
  Linux-aarch64) triple="aarch64-unknown-linux-gnu" ;;
  Darwin-arm64) triple="aarch64-apple-darwin" ;;
  Darwin-x86_64) triple="x86_64-apple-darwin" ;;
  *) triple="" ;;
esac

if [ -n "${triple}" ]; then
  url="https://github.com/rustwasm/wasm-bindgen/releases/download/${VERSION}/wasm-bindgen-${VERSION}-${triple}.tar.gz"
  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp}"' EXIT
  if curl -fsSL "${url}" | tar -xz -C "${tmp}"; then
    bindgen_bin="$(find "${tmp}" -name wasm-bindgen -type f | head -n 1)"
    if [ -n "${bindgen_bin}" ]; then
      install -m 0755 "${bindgen_bin}" "${install_dir}/wasm-bindgen"
      echo "Installed wasm-bindgen ${VERSION} to ${install_dir}/wasm-bindgen"
      exit 0
    fi
  fi
  echo "WARNING: failed to install prebuilt wasm-bindgen ${VERSION} (${triple}); trying cargo install."
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "ERROR: cargo is required to install wasm-bindgen-cli ${VERSION}."
  exit 1
fi

cargo install wasm-bindgen-cli --version "${VERSION}" --force
