#!/usr/bin/env bash
# GRD-DEVOPS-003: Set the shared product version across workspace packages and install URLs.
# Usage: ./scripts/bump-version.sh X.Y.Z
# Independent of npm scripts. Does not call npm or npm version.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NEW_VERSION="${1:-}"

if [[ -z "${NEW_VERSION}" ]]; then
  echo "ERROR: Usage: $0 X.Y.Z" >&2
  exit 1
fi

if [[ ! "${NEW_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: Version must be X.Y.Z (got '${NEW_VERSION}')." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is required to bump versions." >&2
  exit 1
fi

export REPO_ROOT NEW_VERSION
python3 - <<'PY'
import json
import os
import pathlib
import re
import sys

root = pathlib.Path(os.environ["REPO_ROOT"])
new = os.environ["NEW_VERSION"]

pkg_paths = [
    root / "packages" / "core" / "package.json",
    root / "packages" / "cli" / "package.json",
    root / "packages" / "vscode" / "package.json",
]
for path in pkg_paths:
    if not path.is_file():
        print(f"ERROR: missing {path}", file=sys.stderr)
        sys.exit(1)

old = json.loads(pkg_paths[0].read_text(encoding="utf-8"))["version"]
if not isinstance(old, str) or not old:
    print("ERROR: could not read current version from packages/core/package.json", file=sys.stderr)
    sys.exit(1)
if old == new:
    print(f"Already at {new}.")
    sys.exit(0)

def write_json(path: pathlib.Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

for path in pkg_paths:
    pkg = json.loads(path.read_text(encoding="utf-8"))
    pkg["version"] = new
    deps = pkg.get("dependencies")
    if isinstance(deps, dict) and "@gitreqd/core" in deps:
        deps["@gitreqd/core"] = new
    write_json(path, pkg)

lock_path = root / "package-lock.json"
if lock_path.is_file():
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    packages = lock.get("packages")
    if isinstance(packages, dict):
        for key in ("packages/core", "packages/cli", "packages/vscode"):
            entry = packages.get(key)
            if not isinstance(entry, dict):
                continue
            entry["version"] = new
            deps = entry.get("dependencies")
            if isinstance(deps, dict) and "@gitreqd/core" in deps:
                deps["@gitreqd/core"] = new
    write_json(lock_path, lock)

cargo_toml = root / "Cargo.toml"
if cargo_toml.is_file():
    text = cargo_toml.read_text(encoding="utf-8")
    pattern = re.compile(
        r"(\[workspace\.package\][^\[]*?version\s*=\s*\")([^\"]+)(\")",
        re.S,
    )
    match = pattern.search(text)
    if not match:
        print("ERROR: [workspace.package] version not found in Cargo.toml", file=sys.stderr)
        sys.exit(1)
    if match.group(2) != old:
        print(
            f"ERROR: Cargo.toml workspace version {match.group(2)} does not match package version {old}",
            file=sys.stderr,
        )
        sys.exit(1)
    cargo_toml.write_text(pattern.sub(rf"\g<1>{new}\g<3>", text, count=1), encoding="utf-8")

cargo_lock = root / "Cargo.lock"
if cargo_lock.is_file():
    text = cargo_lock.read_text(encoding="utf-8")
    for name in ("gitreqd", "gitreqd-core"):
        pattern = re.compile(
            rf'(\[\[package\]\]\nname = "{re.escape(name)}"\nversion = "){re.escape(old)}(")'
        )
        updated, n = pattern.subn(rf"\g<1>{new}\g<2>", text, count=1)
        if n != 1:
            print(f"ERROR: failed to update Cargo.lock version for {name}", file=sys.stderr)
            sys.exit(1)
        text = updated
    cargo_lock.write_text(text, encoding="utf-8")

def rewrite_text(rel: str) -> None:
    path = root / rel
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    text = text.replace(f"/releases/download/v{old}/", f"/releases/download/v{new}/")
    text = text.replace(f"gitreqd-core-{old}.tgz", f"gitreqd-core-{new}.tgz")
    text = text.replace(f"gitreqd-vscode-{old}.vsix", f"gitreqd-vscode-{new}.vsix")
    text = text.replace(f"gitreqd-{old}.tgz", f"gitreqd-{new}.tgz")
    path.write_text(text, encoding="utf-8")

rewrite_text("README.md")
rewrite_text("packages/vscode/README.md")
print(f"Bumped version {old} -> {new}")
PY
