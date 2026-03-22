import path from "node:path";
import { discoverRequirementPaths, requirementIdFromFilename } from "@gitreqd/core";

const cache = new Map<string, Map<string, string>>();

export type LogFn = (message: string) => void;

/**
 * Resolve a requirement id to its absolute file path. Uses the workspace root
 * as project root. Results are cached per workspace root.
 */
export async function resolveRequirementPath(
  workspaceRoot: string,
  requirementId: string,
  log?: LogFn
): Promise<string | null> {
  const idToPath = await getIdToPathMap(workspaceRoot, log);
  return idToPath.get(requirementId) ?? null;
}

/**
 * Build a map from requirement id to absolute file path for the given
 * workspace root. Cached by workspace root.
 */
async function getIdToPathMap(
  workspaceRoot: string,
  log?: LogFn
): Promise<Map<string, string>> {
  let idToPath = cache.get(workspaceRoot);
  if (idToPath !== undefined) {
    return idToPath;
  }

  log?.(`[Gitreqd] Using workspace root: ${workspaceRoot}`);
  let paths: string[];
  try {
    paths = await discoverRequirementPaths(workspaceRoot);
    log?.(`[Gitreqd] Discovered ${paths.length} requirement file(s)`);
  } catch (err) {
    paths = [];
    log?.(`[Gitreqd] Discovery failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  idToPath = new Map<string, string>();
  for (const filePath of paths) {
    const basename = path.basename(filePath);
    const id = requirementIdFromFilename(basename);
    if (id !== null) {
      idToPath.set(id, filePath);
    }
  }
  cache.set(workspaceRoot, idToPath);
  return idToPath;
}
