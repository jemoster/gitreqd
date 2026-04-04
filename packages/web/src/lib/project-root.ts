import path from "node:path";

/**
 * GRD-LOCAL-001: Resolve gitreqd project root from env (set by CLI `gitreqd browser`).
 */
export function getGitreqdProjectRoot(): string {
  const raw = process.env.GITREQD_PROJECT_ROOT?.trim();
  if (!raw) {
    throw new Error("GITREQD_PROJECT_ROOT is not set");
  }
  return path.resolve(raw);
}
