#!/usr/bin/env python3
"""GRD-DEVOPS-003: Fail if the GitHub release tag or packed artifact names do not match the shared package version.

Usage: ./scripts/assert-release-tag.py <tag_name> [cli|vscode|native]
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PKG_RELS = (
    "packages/core/package.json",
    "packages/cli/package.json",
    "packages/vscode/package.json",
)
CARGO_WORKSPACE_VERSION = re.compile(
    r'\[workspace\.package\][^\[]*?version\s*=\s*"([^"]+)"',
    re.S,
)
ARTIFACTS = {
    "cli": ("release/gitreqd-{version}.tgz", "release/gitreqd-core-{version}.tgz"),
    "vscode": ("packages/vscode/gitreqd-vscode-{version}.vsix",),
    "native": ("release/gitreqd-linux-x86_64",),
}


def die(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def shared_version(root: Path) -> str:
    versions: list[str] = []
    for rel in PKG_RELS:
        path = root / rel
        if not path.is_file():
            die(f"missing {rel}")
        pkg = json.loads(path.read_text(encoding="utf-8"))
        version = pkg.get("version")
        if not isinstance(version, str) or not version:
            die(f"{rel} has no version")
        versions.append(version)
        deps = pkg.get("dependencies")
        if isinstance(deps, dict) and "@gitreqd/core" in deps and deps["@gitreqd/core"] != version:
            die(f"{rel} pins @gitreqd/core@{deps['@gitreqd/core']} but package version is {version}")

    if len(set(versions)) != 1:
        die(f"package versions differ: {versions}")
    shared = versions[0]

    cargo_toml = root / "Cargo.toml"
    if cargo_toml.is_file():
        match = CARGO_WORKSPACE_VERSION.search(cargo_toml.read_text(encoding="utf-8"))
        if not match:
            die("[workspace.package] version not found in Cargo.toml")
        if match.group(1) != shared:
            die(f"Cargo.toml workspace version {match.group(1)} does not match package version {shared}")
    return shared


def assert_artifacts(root: Path, kind: str, version: str) -> None:
    if kind not in ARTIFACTS:
        die(f"unknown artifact kind '{kind}' (expected cli, vscode, or native)")
    missing = False
    for template in ARTIFACTS[kind]:
        rel = template.format(version=version)
        if not (root / rel).is_file():
            print(f"ERROR: missing packed artifact {rel}", file=sys.stderr)
            missing = True
    if missing:
        raise SystemExit(1)


def main(argv: list[str]) -> int:
    if len(argv) < 2 or len(argv) > 3:
        die(f"Usage: {argv[0]} <tag_name> [cli|vscode|native]")
    tag = argv[1]
    kind = argv[2] if len(argv) == 3 else ""

    version = shared_version(REPO_ROOT)
    expected = f"v{version}"
    if tag != expected:
        die(f"release tag '{tag}' does not match package version {version} (expected {expected}).")
    if kind:
        assert_artifacts(REPO_ROOT, kind, version)
        print(f"OK: tag {tag} matches version {version} ({kind} artifacts present)")
    else:
        print(f"OK: tag {tag} matches version {version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
