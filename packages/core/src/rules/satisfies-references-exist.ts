import type { RequirementWithSource, ValidationError } from "../types.js";

/**
 * GRD-VALID-004: The tool shall validate that every reference id under a
 * requirement's "links" (e.g. satisfies) exists as another requirement in
 * the project. Unknown ids are reported with the source path and missing id.
 */
export function satisfiesReferencesExist(
  requirements: RequirementWithSource[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const idSet = new Set(requirements.map((r) => r.id));

  for (const r of requirements) {
    const links = r.links ?? [];
    for (const link of links) {
      const targetId = link.satisfies;
      if (targetId && !idSet.has(targetId)) {
        errors.push({
          path: r.sourcePath,
          message: `Requirement ${r.id} references unknown id: ${targetId}`,
        });
      }
    }
  }

  return errors;
}
