import fs from "node:fs";
import path from "node:path";
import { ROOT_MARKER_FILENAMES } from "@gitreqd/core";

function findProjectRootWithMarker(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 12; i++) {
    for (const name of ROOT_MARKER_FILENAMES) {
      if (fs.existsSync(path.join(dir, name))) {
        return dir;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

/**
 * True when `getGitreqdProjectRoot()` can resolve (explicit env, or Vercel discovery from cwd).
 */
export function hasGitreqdProjectRoot(): boolean {
  if (process.env.GITREQD_PROJECT_ROOT?.trim()) {
    return true;
  }
  if (process.env.VERCEL === "1") {
    return findProjectRootWithMarker(process.cwd()) !== null;
  }
  return false;
}

/**
 * GRD-LOCAL-001: Resolve gitreqd project root from env (set by CLI `gitreqd browser`), or on Vercel by
 * walking up from cwd to find `gitreqd.yaml` / `gitreqd.yml` (monorepo root). Optional override via OpenTofu.
 */
export function getGitreqdProjectRoot(): string {
  const raw = process.env.GITREQD_PROJECT_ROOT?.trim();
  if (raw) {
    return path.resolve(raw);
  }
  if (process.env.VERCEL === "1") {
    const found = findProjectRootWithMarker(process.cwd());
    if (found) {
      return found;
    }
  }
  throw new Error("GITREQD_PROJECT_ROOT is not set");
}
