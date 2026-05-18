import type { RequirementWithSource, ValidationError } from "../types.js";
import type { ValidationRule } from "./types.js";

const RFC2119_PATTERN = /\b(shall|should|may)\b/gi;

function countRfc2119Keywords(text: string): number {
  const matches = text.match(RFC2119_PATTERN);
  return matches?.length ?? 0;
}

/**
 * Validate that `require` is a single normative statement with exactly one RFC2119 keyword.
 */
export const requireValid: ValidationRule = (
  requirement: RequirementWithSource
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const req = requirement.require?.trim() ?? "";
  if (!req) {
    errors.push({
      path: requirement.sourcePath,
      message: "Missing or empty required field: require",
    });
    return errors;
  }
  const count = countRfc2119Keywords(req);
  if (count === 0) {
    errors.push({
      path: requirement.sourcePath,
      message:
        "require must contain exactly one normative keyword (shall, should, or may)",
    });
  } else if (count > 1) {
    errors.push({
      path: requirement.sourcePath,
      message:
        "require must be a single statement with exactly one normative keyword (shall, should, or may)",
    });
  }
  return errors;
};
