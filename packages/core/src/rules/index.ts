import type { RequirementWithSource, ValidationError } from "../types.js";
import type { NamedGlobalRule, NamedRule, ValidationRule } from "./types.js";
import { filenameIdMatch } from "./filename-id-match.js";
import { linksAcyclic } from "./links-acyclic.js";
import { parametersValid } from "./parameters-valid.js";
import { satisfiesReferencesExist } from "./satisfies-references-exist.js";
import { uniqueIds } from "./unique-ids.js";

/**
 * Default validation rules provided by the base ruleset (GRD-VALID-001).
 * Projects can extend by passing additional rules to runRules().
 */
export const defaultRules: NamedRule[] = [
  { id: "GRD-VALID-002", run: filenameIdMatch },
  { id: "GRD-SYS-005", run: parametersValid },
];

/**
 * Default global validation rules (run over all requirements).
 * Includes GRD-VALID-003 (unique ids), GRD-VALID-004 (link references exist),
 * and GRD-VALID-005 (links acyclic).
 */
export const defaultGlobalRules: NamedGlobalRule[] = [
  { id: "GRD-VALID-003", run: uniqueIds },
  { id: "GRD-VALID-004", run: satisfiesReferencesExist },
  { id: "GRD-VALID-005", run: linksAcyclic },
];

/**
 * Run a set of validation rules over all requirements. Returns all
 * errors from all rules. Use defaultRules or pass a custom list to extend.
 */
export function runRules(
  requirements: RequirementWithSource[],
  rules: NamedRule[] = defaultRules
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const requirement of requirements) {
    for (const { run } of rules) {
      errors.push(...run(requirement));
    }
  }
  return errors;
}

/**
 * Run global validation rules over the full requirement set. Returns all
 * errors from all global rules. Use defaultGlobalRules or pass a custom list.
 */
export function runGlobalRules(
  requirements: RequirementWithSource[],
  rules: NamedGlobalRule[] = defaultGlobalRules
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const { run } of rules) {
    errors.push(...run(requirements));
  }
  return errors;
}

export type { NamedGlobalRule, NamedRule, ValidationRule } from "./types.js";
export { filenameIdMatch } from "./filename-id-match.js";
export { linksAcyclic } from "./links-acyclic.js";
export { parametersValid } from "./parameters-valid.js";
export { satisfiesReferencesExist } from "./satisfies-references-exist.js";
export { uniqueIds } from "./unique-ids.js";
