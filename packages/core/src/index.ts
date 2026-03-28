/**
 * Core API for gitreqd. Used by CLI, and later by VSCode, web, and CI.
 */
export {
  discoverProject,
  discoverProjectRoot,
  discoverProjectRootCandidates,
  discoverRequirementPaths,
  findRootMarkerPath,
  getRequirementDirs,
  ROOT_MARKER,
  ROOT_MARKER_FILENAMES,
  ROOT_MARKER_HINT,
} from "./discovery.js";
export type { DiscoverResult } from "./discovery.js";

export {
  REQUIREMENT_FILE_EXTENSION,
  REQUIREMENT_FILE_EXTENSIONS,
  expectedRequirementBasenamesForId,
  isRequirementFilename,
  requirementFileExtensionsDisplay,
  requirementIdFromFilename,
} from "./requirement-files.js";

export {
  resolveRequirementConflicts,
  reconstructSides,
  hasConflictMarkers,
} from "./conflicts.js";
export type { ResolveResult, MergeFieldFn, ResolveRequirementConflictsOptions } from "./conflicts.js";

export {
  parseRequirementContent,
  parseRequirementContentWithSchema,
  parseRequirementData,
  parseRequirementFile,
  parseRequirementFileWithSchema,
} from "./parse.js";

export {
  requirementFileInnerSchema,
  requirementFileDataSchema,
  exportRequirementFileJsonSchema,
} from "./requirement-schema.js";
export type { RequirementFileInner, RequirementSchemaComposeOptions } from "./requirement-schema.js";

export { requirementSchemaComposeOptionsForProject } from "./schema-compose.js";

export {
  loadActiveProfile,
  getActiveProfileId,
  getRequirementProfile,
  listRegisteredProfileIds,
  STANDARD_PROFILE_ID,
} from "./profile/index.js";
export type { RequirementProfile } from "./profile/index.js";

export { loadRequirements, getRequirementsWithLinks } from "./load.js";

export {
  formatRequirementToYaml,
  normalizeRequirementFileTextForCompare,
  preferClipBlockChompForMarkdownKeys,
} from "./format-requirement-yaml.js";
export { formatProjectRequirementFiles } from "./format-project.js";
export type { FormatProjectResult } from "./format-project.js";
export { validateRequirements } from "./validate.js";
export {
  defaultRules,
  defaultGlobalRules,
  runRules,
  runGlobalRules,
  filenameIdMatch,
  linksAcyclic,
  uniqueIds,
  parametersValid,
  satisfiesReferencesExist,
} from "./rules/index.js";
export type {
  NamedRule,
  NamedGlobalRule,
  ValidationRule,
} from "./rules/index.js";

export type {
  Requirement,
  RequirementWithSource,
  Link,
  ParameterValue,
  ProjectInfo,
  ValidationError,
  LoadResult,
} from "./types.js";

export { resolveText, resolveToSegments } from "./parameters.js";
export type { ResolvedSegment } from "./parameters.js";

export {
  parseLlmConfig,
  validateLlmForUse,
  ollamaModelMatchesTag,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_OLLAMA_BASE_URL,
} from "./llm-config.js";
export type { LlmRuntimeConfig, ParseLlmConfigResult } from "./llm-config.js";

export { generateFullHtml, generateSingleRequirementHtml } from "./html.js";
