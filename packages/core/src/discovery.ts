import { glob } from "glob";
import path from "node:path";
import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { REQUIREMENT_FILE_EXTENSIONS } from "./requirement-files.js";

/** GRD-SYS-007: primary project root marker filename (bootstrap writes this name). */
export const ROOT_MARKER = "gitreqd.yaml";

/** GRD-SYS-007: accepted project root marker filenames (first wins when reading if several exist). */
export const ROOT_MARKER_FILENAMES = ["gitreqd.yaml", "gitreqd.yml"] as const;

/** User-facing hint when no marker is found. */
export const ROOT_MARKER_HINT = "gitreqd.yaml or gitreqd.yml";

/**
 * Absolute path to the project root marker file under `projectRoot`, or null if none exist.
 * GRD-SYS-007: prefers `gitreqd.yaml` over `gitreqd.yml` when both exist.
 */
export function findRootMarkerPath(projectRoot: string): string | null {
  for (const name of ROOT_MARKER_FILENAMES) {
    const p = path.join(projectRoot, name);
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Find the candidate project root by starting at `startDir` and walking up the directory structure.
 *
 * Returns an array with zero or one absolute directory paths. Empty if none.
 */
export async function discoverProjectRootCandidates(startDir: string): Promise<string[]> {
  const resolved = path.resolve(startDir);
  let current = fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);

  while (true) {
    if (findRootMarkerPath(current) !== null) {
      return [current];
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return [];
    }
    current = parent;
  }
}

/**
 * Find the project root by searching from `startDir` and walking up the directory
 * structure until the first directory containing a root marker is found.
 * Returns that root directory, or null if none is found.
 */
export async function discoverProjectRoot(startDir: string): Promise<string | null> {
  const candidates = await discoverProjectRootCandidates(startDir);
  return candidates.length === 1 ? candidates[0]! : null;
}

/**
 * Read the project root marker under `projectRoot` and return the configured
 * requirement directories, as absolute paths. The file must follow GRD-SYS-007.
 */
export function getRequirementDirs(projectRoot: string): string[] {
  const rootPath = findRootMarkerPath(projectRoot);
  if (rootPath === null) {
    throw new Error(`Failed to find ${ROOT_MARKER_HINT} under ${path.resolve(projectRoot)}`);
  }
  const markerLabel = path.basename(rootPath);
  let raw: string;
  try {
    raw = fs.readFileSync(rootPath, "utf-8");
  } catch (err) {
    throw new Error(`Failed to read ${markerLabel} at ${rootPath}: ${String(err)}`);
  }

  let data: unknown;
  try {
    data = parseYaml(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${markerLabel} at ${rootPath}: ${String(err)}`);
  }

  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Invalid ${markerLabel} at ${rootPath}: expected a mapping at top level`);
  }

  const obj = data as Record<string, unknown>;
  const dirs = obj.requirement_dirs;
  if (!Array.isArray(dirs)) {
    throw new Error(`Invalid ${markerLabel} at ${rootPath}: "requirement_dirs" must be a sequence`);
  }

  const resolvedDirs: string[] = [];
  const seen = new Set<string>();

  for (const rawValue of dirs) {
    if (typeof rawValue !== "string") {
      throw new Error(
        `Invalid ${markerLabel} at ${rootPath}: each "requirement_dirs" entry must be a non-empty string`
      );
    }
    const trimmed = rawValue.trim();
    if (trimmed.length === 0) {
      throw new Error(
        `Invalid ${markerLabel} at ${rootPath}: each "requirement_dirs" entry must be a non-empty string`
      );
    }
    const abs = path.resolve(projectRoot, trimmed);
    if (seen.has(abs)) {
      throw new Error(
        `Invalid ${markerLabel} at ${rootPath}: duplicate "requirement_dirs" entry after resolving paths: ${abs}`
      );
    }
    seen.add(abs);
    resolvedDirs.push(abs);
  }

  return resolvedDirs;
}

/**
 * Discover all requirement files under the directories configured in the project root marker.
 * GRD-SYS-007: `*.req.yml` and `*.req.yaml`. Excludes node_modules.
 * GRD-SYS-007: a `requirement_dirs` entry of exactly `.` resolves to the project root and is searched recursively (root and all subdirectories).
 */
export async function discoverRequirementPaths(projectRoot: string): Promise<string[]> {
  const cwd = path.resolve(projectRoot);
  const requirementDirs = getRequirementDirs(cwd);
  if (requirementDirs.length === 0) {
    return [];
  }

  const relDirs = requirementDirs.map((abs) => path.relative(cwd, abs) || ".");
  const patterns: string[] = [];
  for (const rel of relDirs) {
    const base = rel === "." ? "" : `${rel.replace(/\/+$/, "")}/`;
    for (const ext of REQUIREMENT_FILE_EXTENSIONS) {
      patterns.push(`${base}**/*${ext}`);
    }
  }

  const ignore = ["**/node_modules/**"];
  const matches = await glob(patterns, { cwd, ignore, absolute: true });
  return [...new Set(matches)].sort();
}

export interface DiscoverResult {
  rootDir: string;
  requirementPaths: string[];
}

/**
 * Discover project root from `startDir` (walking up) and all requirement
 * file paths under it. Throws if no project root is found.
 */
export async function discoverProject(startDir: string): Promise<DiscoverResult> {
  const candidates = await discoverProjectRootCandidates(startDir);
  if (candidates.length === 0) {
    throw new Error(`No project root found (missing ${ROOT_MARKER_HINT}) from: ${path.resolve(startDir)}`);
  }
  const rootDir = candidates[0]!;
  const requirementPaths = await discoverRequirementPaths(rootDir);
  return { rootDir, requirementPaths };
}
