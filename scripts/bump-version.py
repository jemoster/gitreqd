#!/usr/bin/env python3
"""GRD-DEVOPS-003: Set the shared product version across workspace packages and install URLs.

Usage: ./scripts/bump-version.py X.Y.Z
Independent of npm scripts. Does not call npm or npm version.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

VERSION_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
REPO_ROOT = Path(__file__).resolve().parent.parent
PKG_RELS = (
    Path("packages/core/package.json"),
    Path("packages/vscode/package.json"),
)
LOCK_PKG_KEYS = ("packages/core", "packages/vscode")
CARGO_WORKSPACE_VERSION = re.compile(
    r'(\[workspace\.package\][^\[]*?version\s*=\s*")([^"]+)(")',
    re.S,
)
CARGO_PACKAGE_NAMES = ("gitreqd", "gitreqd-core", "gitreqd-wasm")


def die(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def rewrite_install_docs(root: Path, old: str, new: str) -> None:
    for rel in ("README.md", "packages/vscode/README.md"):
        path = root / rel
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        # README tags may already disagree with package.json; always point install URLs at v${new}.
        text = re.sub(r"/releases/download/v\d+\.\d+\.\d+/", f"/releases/download/v{new}/", text)
        text = text.replace(f"gitreqd-core-{old}.tgz", f"gitreqd-core-{new}.tgz")
        text = text.replace(f"gitreqd-vscode-{old}.vsix", f"gitreqd-vscode-{new}.vsix")
        path.write_text(text, encoding="utf-8")


def bump(root: Path, new: str) -> None:
    pkg_paths = [root / rel for rel in PKG_RELS]
    for path in pkg_paths:
        if not path.is_file():
            die(f"missing {path}")

    old = json.loads(pkg_paths[0].read_text(encoding="utf-8")).get("version")
    if not isinstance(old, str) or not old:
        die("could not read current version from packages/core/package.json")
    if old == new:
        print(f"Already at {new}.")
        return

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
            for key in LOCK_PKG_KEYS:
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
        match = CARGO_WORKSPACE_VERSION.search(text)
        if not match:
            die("[workspace.package] version not found in Cargo.toml")
        if match.group(2) != old:
            die(f"Cargo.toml workspace version {match.group(2)} does not match package version {old}")
        cargo_toml.write_text(CARGO_WORKSPACE_VERSION.sub(rf"\g<1>{new}\g<3>", text, count=1), encoding="utf-8")

    cargo_lock = root / "Cargo.lock"
    if cargo_lock.is_file():
        text = cargo_lock.read_text(encoding="utf-8")
        for name in CARGO_PACKAGE_NAMES:
            pattern = re.compile(
                rf'(\[\[package\]\]\nname = "{re.escape(name)}"\nversion = "){re.escape(old)}(")'
            )
            text, n = pattern.subn(rf"\g<1>{new}\g<2>", text, count=1)
            if n != 1:
                die(f"failed to update Cargo.lock version for {name}")
        cargo_lock.write_text(text, encoding="utf-8")

    rewrite_install_docs(root, old, new)
    print(f"Bumped version {old} -> {new}")


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        die(f"Usage: {argv[0]} X.Y.Z")
    new = argv[1]
    if not VERSION_RE.fullmatch(new):
        die(f"Version must be X.Y.Z (got '{new}').")
    bump(REPO_ROOT, new)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
