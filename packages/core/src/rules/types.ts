import type { RequirementWithSource, ValidationError } from "../types.js";

/**
 * A validation rule: takes a single requirement (with its source path) and
 * returns zero or more validation errors. Rules can be composed into a
 * ruleset and extended by projects (GRD-VALID-001).
 */
export type ValidationRule = (requirement: RequirementWithSource) => ValidationError[];

/**
 * A named rule for registration and reporting. Projects can add their own
 * rules to the default ruleset.
 */
export interface NamedRule {
  id: string;
  run: ValidationRule;
}

/**
 * A global validation rule: takes all requirements and returns validation
 * errors. Used for checks that need the full set (e.g. unique ids).
 */
export type GlobalValidationRule = (
  requirements: RequirementWithSource[]
) => ValidationError[];

/**
 * A named global rule for registration and reporting.
 */
export interface NamedGlobalRule {
  id: string;
  run: GlobalValidationRule;
}
