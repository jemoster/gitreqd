import path from "node:path";
import { discoverProject, discoverRequirementPaths, getRequirementDirs } from "./discovery.js";
import { parseRequirementFile } from "./parse.js";
import { validateRequirements } from "./validate.js";
import type { LoadResult, RequirementWithSource, ValidationError } from "./types.js";

/**
 * GRD-SYS-004: Compute category path segments for a requirement from its
 * sourcePath and the project's requirement_dirs. Returns the path from the
 * requirement_dir that contains the file to the file's directory.
 */
function categoryPathFor(
  sourcePath: string,
  requirementDirs: string[]
): string[] {
  const fileDir = path.dirname(sourcePath);
  const normalized = path.normalize(fileDir);
  for (const dir of requirementDirs) {
    const reqDirNorm = path.normalize(path.resolve(dir));
    if (normalized === reqDirNorm || normalized.startsWith(reqDirNorm + path.sep)) {
      const rel = path.relative(reqDirNorm, normalized);
      if (rel === "" || rel === ".") return [];
      return rel.split(path.sep).filter(Boolean);
    }
  }
  return [];
}

/**
 * Load all requirements from a project directory. If projectRoot is provided,
 * uses that root; otherwise discovers root from startDir (throws if none or multiple).
 * Parses each requirement file and validates (schema + duplicate ids + broken links).
 * GRD-SYS-004: Sets categoryPath on each requirement from directory structure.
 */
export async function loadRequirements(
  startDir: string,
  projectRoot?: string
): Promise<LoadResult> {
  let root: string;
  let requirementPaths: string[];
  if (projectRoot != null) {
    root = projectRoot;
    requirementPaths = await discoverRequirementPaths(projectRoot);
  } else {
    const discovered = await discoverProject(startDir);
    root = discovered.rootDir;
    requirementPaths = discovered.requirementPaths;
  }

  const requirementDirs = getRequirementDirs(root);
  const requirements: RequirementWithSource[] = [];
  const errors: ValidationError[] = [];

  for (const filePath of requirementPaths) {
    const result = parseRequirementFile(filePath);
    if ("error" in result) {
      errors.push(result.error);
    } else {
      const req = result.requirement;
      req.categoryPath = categoryPathFor(filePath, requirementDirs);
      requirements.push(req);
    }
  }

  const validationErrors = validateRequirements(requirements);
  errors.push(...validationErrors);

  return { requirements, errors };
}

/**
 * Get requirements with satisfies links resolved (same list; links are already on each requirement).
 * Exposed for consumers that need to build a graph or report. For now we just return the list.
 */
export function getRequirementsWithLinks(requirements: RequirementWithSource[]): RequirementWithSource[] {
  return requirements;
}
