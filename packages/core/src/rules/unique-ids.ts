import type { RequirementWithSource, ValidationError } from "../types.js";

/**
 * GRD-VALID-003: The tool shall validate that all requirement ids are unique
 * across the project. Duplicate ids are reported with the paths of the
 * conflicting files.
 */
export function uniqueIds(
  requirements: RequirementWithSource[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const byId = new Map<string, RequirementWithSource>();

  for (const r of requirements) {
    const existing = byId.get(r.id);
    if (existing) {
      errors.push({
        path: r.sourcePath,
        message: `Duplicate requirement id: ${r.id} (also in ${existing.sourcePath})`,
      });
    } else {
      byId.set(r.id, r);
    }
  }

  return errors;
}
