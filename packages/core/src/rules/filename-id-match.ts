import path from "node:path";
import type { RequirementWithSource, ValidationError } from "../types.js";
import {
  expectedRequirementBasenamesForId,
  requirementFileExtensionsDisplay,
  requirementIdFromFilename,
} from "../requirement-files.js";

/**
 * GRD-VALID-002: The tool shall validate that requirement files are named
 * after their id and that the id matches the file name.
 */
export function filenameIdMatch(requirement: RequirementWithSource): ValidationError[] {
  const basename = path.basename(requirement.sourcePath);
  const nameWithoutExt = requirementIdFromFilename(basename);
  if (nameWithoutExt === null) {
    return [{
      path: requirement.sourcePath,
      message: `Requirement file must use ${requirementFileExtensionsDisplay()} (got "${basename}")`,
    }];
  }
  if (nameWithoutExt !== requirement.id) {
    return [{
      path: requirement.sourcePath,
      message: `Requirement id "${requirement.id}" does not match filename "${basename}" (expected ${expectedRequirementBasenamesForId(requirement.id)})`,
    }];
  }
  return [];
}
