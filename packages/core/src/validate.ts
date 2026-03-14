import type { RequirementWithSource, ValidationError } from "./types.js";
import { runGlobalRules, runRules } from "./rules/index.js";

/**
 * Validate a list of requirements (GRD-VALID-003 unique ids, GRD-VALID-004
 * link references exist, GRD-VALID-005 links acyclic, and ruleset rules such
 * as filename-id match). Returns a list of validation errors; empty if valid.
 */
export function validateRequirements(requirements: RequirementWithSource[]): ValidationError[] {
  const errors: ValidationError[] = [];
  errors.push(...runGlobalRules(requirements));
  errors.push(...runRules(requirements));
  return errors;
}
