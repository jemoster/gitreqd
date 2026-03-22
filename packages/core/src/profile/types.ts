import type { RequirementSchemaComposeOptions } from "../requirement-schema.js";
import type { RequirementWithSource, ValidationError } from "../types.js";

/**
 * GRD-SYS-010: Active profile drives requirement document shape, validation, and HTML output.
 * New profiles register in `registry.ts` and are selected via `gitreqd.yaml` `profile`.
 */
export interface RequirementProfile {
  readonly id: string;
  parseRequirementFile(filePath: string): { requirement: RequirementWithSource } | { error: ValidationError };
  parseRequirementContent(content: string, filePath: string): { requirement: RequirementWithSource } | { error: ValidationError };
  validateRequirements(requirements: RequirementWithSource[]): ValidationError[];
  exportRequirementFileJsonSchema(options?: RequirementSchemaComposeOptions): Record<string, unknown>;
  requirementSchemaComposeOptionsForProject(projectRoot: string): RequirementSchemaComposeOptions | undefined;
  generateFullHtml(requirements: RequirementWithSource[]): string;
  generateSingleRequirementHtml(
    requirement: RequirementWithSource,
    allRequirements?: RequirementWithSource[]
  ): string;
}
