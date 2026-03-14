import type { RequirementWithSource, ValidationError } from "../types.js";
import type { ValidationRule } from "./types.js";

/** GRD-SYS-005: Top-level requirement fields; parameter names must not overlap these. */
const TOP_LEVEL_KEYS = new Set([
  "id",
  "title",
  "description",
  "attributes",
  "links",
  "parameters",
]);

/**
 * GRD-SYS-005: Validate that parameter names are unique within the requirement
 * and do not overlap with any other fields in the requirement.
 */
export const parametersValid: ValidationRule = (
  requirement: RequirementWithSource
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const params = requirement.parameters;
  if (params == null || typeof params !== "object") return errors;

  const names = Object.keys(params);
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      errors.push({
        path: requirement.sourcePath,
        message: `GRD-SYS-005: Duplicate parameter name: ${name}`,
      });
    }
    seen.add(name);
    if (TOP_LEVEL_KEYS.has(name)) {
      errors.push({
        path: requirement.sourcePath,
        message: `GRD-SYS-005: Parameter name must not overlap with requirement field: ${name}`,
      });
    }
  }
  return errors;
};
