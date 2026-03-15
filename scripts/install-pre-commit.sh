#!/usr/bin/env bash
# GRD-GIT-003: Install the gitreqd pre-commit hook into a repository's .git/hooks.
# Usage: ./scripts/install-pre-commit.sh [REPO_DIR]
#   REPO_DIR  Optional. Git repository path. Default: repository containing the current working directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SRC="${SCRIPT_DIR}/pre-commit"

if [ $# -ge 1 ]; then
  REPO_DIR="$(cd "$1" && pwd)"
else
  REPO_DIR="$(git rev-parse --show-toplevel)"
fi

GIT_DIR="${REPO_DIR}/.git"
HOOKS_DIR="${GIT_DIR}/hooks"
HOOK_DEST="${HOOKS_DIR}/pre-commit"

if [ ! -d "${GIT_DIR}" ]; then
  echo "ERROR: Not a git repository: ${REPO_DIR}"
  exit 1
fi

mkdir -p "${HOOKS_DIR}"
cp "${HOOK_SRC}" "${HOOK_DEST}"
chmod +x "${HOOK_DEST}"
echo "Installed pre-commit hook at ${HOOK_DEST}"
