#!/usr/bin/env bash
# GRD-DEVOPS-003: Fail if the GitHub release tag or packed artifact names do not match the shared package version.
# Usage: ./scripts/assert-release-tag.sh <tag_name> [cli|vscode|native]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAG="${1:-}"
KIND="${2:-}"

if [[ -z "${TAG}" ]]; then
  echo "ERROR: Usage: $0 <tag_name> [cli|vscode|native]" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is required to read package versions." >&2
  exit 1
fi

VERSION="$(
  REPO_ROOT="${REPO_ROOT}" python3 - <<'PY'
import json
import os
import pathlib
import re
import sys

root = pathlib.Path(os.environ["REPO_ROOT"])
pkg_rels = [
    "packages/core/package.json",
    "packages/cli/package.json",
    "packages/vscode/package.json",
]
versions = []
for rel in pkg_rels:
    path = root / rel
    if not path.is_file():
        print(f"ERROR: missing {rel}", file=sys.stderr)
        sys.exit(1)
    pkg = json.loads(path.read_text(encoding="utf-8"))
    version = pkg.get("version")
    if not isinstance(version, str) or not version:
        print(f"ERROR: {rel} has no version", file=sys.stderr)
        sys.exit(1)
    versions.append(version)
    deps = pkg.get("dependencies")
    if isinstance(deps, dict) and "@gitreqd/core" in deps and deps["@gitreqd/core"] != version:
        print(
            f"ERROR: {rel} pins @gitreqd/core@{deps['@gitreqd/core']} but package version is {version}",
            file=sys.stderr,
        )
        sys.exit(1)

if len(set(versions)) != 1:
    print(f"ERROR: package versions differ: {versions}", file=sys.stderr)
    sys.exit(1)
shared = versions[0]

cargo_toml = root / "Cargo.toml"
if cargo_toml.is_file():
    text = cargo_toml.read_text(encoding="utf-8")
    match = re.search(
        r"\[workspace\.package\][^\[]*?version\s*=\s*\"([^\"]+)\"",
        text,
        re.S,
    )
    if not match:
        print("ERROR: [workspace.package] version not found in Cargo.toml", file=sys.stderr)
        sys.exit(1)
    if match.group(1) != shared:
        print(
            f"ERROR: Cargo.toml workspace version {match.group(1)} does not match package version {shared}",
            file=sys.stderr,
        )
        sys.exit(1)

print(shared)
PY
)"

EXPECTED="v${VERSION}"
if [[ "${TAG}" != "${EXPECTED}" ]]; then
  echo "ERROR: release tag '${TAG}' does not match package version ${VERSION} (expected ${EXPECTED})." >&2
  exit 1
fi

case "${KIND}" in
  "")
    ;;
  cli)
    missing=0
    for rel in "release/gitreqd-${VERSION}.tgz" "release/gitreqd-core-${VERSION}.tgz"; do
      if [[ ! -f "${REPO_ROOT}/${rel}" ]]; then
        echo "ERROR: missing packed artifact ${rel}" >&2
        missing=1
      fi
    done
    if [[ "${missing}" -ne 0 ]]; then
      exit 1
    fi
    ;;
  vscode)
    rel="packages/vscode/gitreqd-vscode-${VERSION}.vsix"
    if [[ ! -f "${REPO_ROOT}/${rel}" ]]; then
      echo "ERROR: missing packed artifact ${rel}" >&2
      exit 1
    fi
    ;;
  native)
    rel="release/gitreqd-linux-x86_64"
    if [[ ! -f "${REPO_ROOT}/${rel}" ]]; then
      echo "ERROR: missing packed artifact ${rel}" >&2
      exit 1
    fi
    ;;
  *)
    echo "ERROR: unknown artifact kind '${KIND}' (expected cli, vscode, or native)" >&2
    exit 1
    ;;
esac

echo "OK: tag ${TAG} matches version ${VERSION}${KIND:+ (${KIND} artifacts present)}"
