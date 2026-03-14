import { glob } from "glob";
import path from "node:path";
import fs from "node:fs";
import { parse as parseYaml } from "yaml";

export const ROOT_MARKER = "root.gitreqd";

/**
 * Find the candidate project root containing `root.gitreqd` by starting at
 * `startDir` and walking up the directory structure.
 *
 * Returns an array with zero or one absolute directory paths. Empty if none.
 */
export async function discoverProjectRootCandidates(startDir: string): Promise<string[]> {
  const resolved = path.resolve(startDir);
  let current = fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);

  while (true) {
    const markerPath = path.join(current, ROOT_MARKER);
    if (fs.existsSync(markerPath)) {
      return [current];
    }
    const parent = path.dirname(current);
    if (parent === current) {
      // Reached filesystem root without finding a marker.
      return [];
    }
    current = parent;
  }
}

/**
 * Find the project root by searching from `startDir` and walking up the directory
 * structure until the first directory containing root.gitreqd is found.
 * Returns that root directory, or null if none is found.
 */
export async function discoverProjectRoot(startDir: string): Promise<string | null> {
  const candidates = await discoverProjectRootCandidates(startDir);
  return candidates.length === 1 ? candidates[0]! : null;
}

/**
 * GRD-SYS-004: Read root.gitreqd under `projectRoot` and return the configured
 * requirement directories, as absolute paths. The file must follow GRD-SYS-007:
 * - Top-level mapping
 * - `requirement_dirs` key with a sequence of non-empty strings
 * - Paths are relative to project root
 */
export function getRequirementDirs(projectRoot: string): string[] {
  const rootPath = path.join(projectRoot, ROOT_MARKER);
  let raw: string;
  try {
    raw = fs.readFileSync(rootPath, "utf-8");
  } catch (err) {
    throw new Error(`Failed to read ${ROOT_MARKER} at ${rootPath}: ${String(err)}`);
  }

  let data: unknown;
  try {
    data = parseYaml(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${ROOT_MARKER} at ${rootPath}: ${String(err)}`);
  }

  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`Invalid ${ROOT_MARKER} at ${rootPath}: expected a mapping at top level`);
  }

  const obj = data as Record<string, unknown>;
  const dirs = obj.requirement_dirs;
  if (!Array.isArray(dirs)) {
    throw new Error(`Invalid ${ROOT_MARKER} at ${rootPath}: "requirement_dirs" must be a sequence`);
  }

  const resolvedDirs: string[] = [];
  const seen = new Set<string>();

  for (const rawValue of dirs) {
    if (typeof rawValue !== "string") {
      throw new Error(
        `Invalid ${ROOT_MARKER} at ${rootPath}: each "requirement_dirs" entry must be a non-empty string`
      );
    }
    const trimmed = rawValue.trim();
    if (trimmed.length === 0) {
      throw new Error(
        `Invalid ${ROOT_MARKER} at ${rootPath}: each "requirement_dirs" entry must be a non-empty string`
      );
    }
    const abs = path.resolve(projectRoot, trimmed);
    if (seen.has(abs)) {
      throw new Error(
        `Invalid ${ROOT_MARKER} at ${rootPath}: duplicate "requirement_dirs" entry after resolving paths: ${abs}`
      );
    }
    seen.add(abs);
    resolvedDirs.push(abs);
  }

  return resolvedDirs;
}

/**
 * GRD-GIT-002: Read ollama config from root.gitreqd (base_url, model).
 * Returns null if ollama key is missing or invalid.
 */
export function getOllamaConfig(projectRoot: string): { base_url: string; model: string } | null {
  const rootPath = path.join(projectRoot, ROOT_MARKER);
  let raw: string;
  try {
    raw = fs.readFileSync(rootPath, "utf-8");
  } catch {
    return null;
  }
  let data: unknown;
  try {
    data = parseYaml(raw);
  } catch {
    return null;
  }
  if (data == null || typeof data !== "object" || Array.isArray(data)) return null;
  const obj = data as Record<string, unknown>;
  const ollama = obj.ollama;
  if (ollama == null || typeof ollama !== "object" || Array.isArray(ollama)) return null;
  const o = ollama as Record<string, unknown>;
  const base_url = typeof o.base_url === "string" ? o.base_url : "http://localhost:11434";
  const model = typeof o.model === "string" ? o.model : "";
  if (!model) return null;
  return { base_url, model };
}

/**
 * Discover all requirement YAML files under the directories configured in
 * root.gitreqd. Excludes node_modules. Returns absolute paths to *.yml and
 * *.yaml files.
 */
export async function discoverRequirementPaths(projectRoot: string): Promise<string[]> {
  const cwd = path.resolve(projectRoot);
  const requirementDirs = getRequirementDirs(cwd);
  if (requirementDirs.length === 0) {
    return [];
  }

  // Build glob patterns scoped to each configured directory (relative to project root).
  const relDirs = requirementDirs.map((abs) => path.relative(cwd, abs) || ".");
  const patterns: string[] = [];
  for (const rel of relDirs) {
    const base = rel === "." ? "" : `${rel.replace(/\/+$/, "")}/`;
    patterns.push(`${base}**/*.yml`, `${base}**/*.yaml`);
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
    throw new Error(`No project root found (missing ${ROOT_MARKER}) from: ${path.resolve(startDir)}`);
  }
  const rootDir = candidates[0]!;
  const requirementPaths = await discoverRequirementPaths(rootDir);
  return { rootDir, requirementPaths };
}
