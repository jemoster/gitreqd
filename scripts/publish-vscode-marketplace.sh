#!/usr/bin/env bash
# GRD-VSC-008: Publish the packaged shallgraph-vscode VSIX to the Visual Studio Marketplace.
# Uses the same versioned VSIX that the release workflow uploads to GitHub (GRD-DEVOPS-002 / GRD-DEVOPS-003).
# Requires VSCE_PAT (Azure DevOps PAT with Marketplace Manage, all accessible organizations).
# Usage: ./scripts/publish-vscode-marketplace.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -z "${VSCE_PAT:-}" ]]; then
  echo "ERROR: VSCE_PAT is not set. Create an Azure DevOps PAT at https://dev.azure.com/{your-org}/_usersSettings/tokens with Marketplace Manage (All accessible organizations) and export it before publishing."
  exit 1
fi

VSIX_DIR="${SHALLGRAPH_VSIX_DIR:-${REPO_ROOT}/packages/vscode}"
shopt -s nullglob
vsix_files=("${VSIX_DIR}"/shallgraph-vscode-*.vsix)
if [[ "${#vsix_files[@]}" -ne 1 ]]; then
  echo "ERROR: expected exactly one VSIX matching ${VSIX_DIR}/shallgraph-vscode-*.vsix, found ${#vsix_files[@]}."
  echo "Package first with: npm run package -w shallgraph-vscode"
  exit 1
fi

VSIX="${vsix_files[0]}"
echo "Publishing ${VSIX} to the Visual Studio Marketplace ..."
cd "${REPO_ROOT}/packages/vscode"
npx vsce publish --packagePath "${VSIX}" --pat "${VSCE_PAT}" --skip-duplicate
echo "Done. Extension: https://marketplace.visualstudio.com/items?itemName=shallgraph.shallgraph-vscode"
