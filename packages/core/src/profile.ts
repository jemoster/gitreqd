import type { ArtifactLinkRenderOptions, RequirementSchemaComposeOptions, RequirementWithSource, ValidationError } from "./types.js";
import {
  exportRequirementFileJsonSchema,
  generateSingleRequirementHtmlRaw,
  parseRequirementContent,
  stampEditableFieldMarkers,
  validateRequirements,
} from "./engine.js";
import { parseRequirementFile, getActiveProfileId } from "./fs-adapter.js";
import { STANDARD_PROFILE_ID } from "./constants.js";

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
    allRequirements?: RequirementWithSource[],
    options?: { editableFieldMarkers?: boolean; artifactLinks?: ArtifactLinkRenderOptions }
  ): string;
}

const standardProfile: RequirementProfile = {
  id: STANDARD_PROFILE_ID,
  parseRequirementFile,
  parseRequirementContent,
  validateRequirements,
  exportRequirementFileJsonSchema(compose) {
    return exportRequirementFileJsonSchema(compose);
  },
  requirementSchemaComposeOptionsForProject() {
    return undefined;
  },
  generateFullHtml() {
    throw new Error("Full-report HTML is provided by the native gitreqd CLI");
  },
  generateSingleRequirementHtml(requirement, allRequirements, options) {
    const artifactLinksJson = options?.artifactLinks
      ? JSON.stringify({
          github: options.artifactLinks.github
            ? {
                owner: options.artifactLinks.github.owner,
                repo: options.artifactLinks.github.repo,
                commitSha: options.artifactLinks.github.commitSha,
                projectRootRel: options.artifactLinks.github.projectRootRel,
              }
            : undefined,
        })
      : null;
    const html = generateSingleRequirementHtmlRaw(requirement, allRequirements, artifactLinksJson);
    return options?.editableFieldMarkers ? stampEditableFieldMarkers(html) : html;
  },
};

export function generateSingleRequirementHtml(
  requirement: RequirementWithSource,
  allRequirements?: RequirementWithSource[],
  options?: { editableFieldMarkers?: boolean; artifactLinks?: ArtifactLinkRenderOptions }
): string {
  return standardProfile.generateSingleRequirementHtml(requirement, allRequirements, options);
}

export function getRequirementProfile(id: string): RequirementProfile {
  if (id !== STANDARD_PROFILE_ID) {
    throw new Error(`Unknown requirement profile: ${id}`);
  }
  return standardProfile;
}

export function listRegisteredProfileIds(): string[] {
  return [STANDARD_PROFILE_ID];
}

export function loadActiveProfile(projectRoot: string): RequirementProfile {
  return getRequirementProfile(getActiveProfileId(projectRoot));
}

export { STANDARD_PROFILE_ID };
