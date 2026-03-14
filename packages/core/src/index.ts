/**
 * Core API for gitreqd. Used by CLI, and later by VSCode, web, and CI.
 */
export {
  discoverProject,
  discoverProjectRoot,
  discoverProjectRootCandidates,
  discoverRequirementPaths,
  getRequirementDirs,
  getOllamaConfig,
  ROOT_MARKER,
} from "./discovery.js";
export type { DiscoverResult } from "./discovery.js";

export {
  resolveRequirementConflicts,
  reconstructSides,
  hasConflictMarkers,
} from "./conflicts.js";
export type { OllamaConfig, ResolveResult, MergeFieldFn, ResolveRequirementConflictsOptions } from "./conflicts.js";

export { parseRequirementContent } from "./parse.js";

export { loadRequirements, getRequirementsWithLinks } from "./load.js";
export { parseRequirementFile } from "./parse.js";
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

export { generateFullHtml, generateSingleRequirementHtml } from "./html.js";
