/**
 * GRD-SYS-010: Default `standard` profile — current requirement schema, ruleset, and HTML report layout.
 */
import { generateFullHtml, generateSingleRequirementHtml } from "../html.js";
import {
  exportRequirementFileJsonSchema,
  requirementFileDataSchema,
  type RequirementSchemaComposeOptions,
} from "../requirement-schema.js";
import { requirementSchemaComposeOptionsForProject as composeOptionsFromProjectMarker } from "../schema-compose.js";
import type { RequirementProfile } from "./types.js";
import { parseRequirementContentWithSchema, parseRequirementFileWithSchema } from "../parse.js";
import { validateRequirements } from "../validate.js";

export const standardProfile: RequirementProfile = {
  id: "standard",
  parseRequirementFile(filePath) {
    return parseRequirementFileWithSchema(filePath, requirementFileDataSchema);
  },
  parseRequirementContent(content, filePath) {
    return parseRequirementContentWithSchema(content, filePath, requirementFileDataSchema);
  },
  validateRequirements,
  exportRequirementFileJsonSchema,
  requirementSchemaComposeOptionsForProject(projectRoot: string): RequirementSchemaComposeOptions | undefined {
    return composeOptionsFromProjectMarker(projectRoot);
  },
  generateFullHtml,
  generateSingleRequirementHtml,
};
