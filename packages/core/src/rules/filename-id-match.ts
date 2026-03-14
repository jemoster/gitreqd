import path from "node:path";
import type { RequirementWithSource, ValidationError } from "../types.js";

/**
 * GRD-VALID-002: The tool shall validate that requirement files are named
 * after their id and that the id matches the file name.
 */
export function filenameIdMatch(requirement: RequirementWithSource): ValidationError[] {
  const basename = path.basename(requirement.sourcePath);
  const ext = path.extname(basename);
  if (ext !== ".yml" && ext !== ".yaml") {
    return [{
      path: requirement.sourcePath,
      message: `Requirement file must have .yml or .yaml extension (got ${ext || "(none)"})`,
    }];
  }
  const nameWithoutExt = basename.slice(0, -ext.length);
  if (nameWithoutExt !== requirement.id) {
    return [{
      path: requirement.sourcePath,
      message: `Requirement id "${requirement.id}" does not match filename "${basename}" (expected ${requirement.id}${ext})`,
    }];
  }
  return [];
}
