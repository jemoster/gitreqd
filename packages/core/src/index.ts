/**
 * JS facade over gitreqd-core WASM. Node filesystem helpers stay in this package
 * so desktop VS Code can load projects without a web-extension rewrite.
 */
export { loadWasmBindings } from "./wasm.js";

export {
  ROOT_MARKER,
  ROOT_MARKER_FILENAMES,
  ROOT_MARKER_HINT,
  REQUIREMENT_FILE_EXTENSION,
  REQUIREMENT_FILE_EXTENSIONS,
  STANDARD_PROFILE_ID,
  isRequirementFilename,
  requirementIdFromFilename,
  requirementFileExtensionsDisplay,
  expectedRequirementBasenamesForId,
} from "./constants.js";

export {
  discoverProject,
  discoverProjectRoot,
  discoverProjectRootCandidates,
  discoverRequirementPaths,
  findRootMarkerPath,
  getRequirementDirs,
  getActiveProfileId,
  loadRequirements,
  parseRequirementFile,
} from "./fs-adapter.js";

export {
  parseRequirementContent,
  validateRequirements,
  formatRequirementToYaml,
  exportRequirementFileJsonSchema,
} from "./engine.js";

export {
  getRequirementProfile,
  listRegisteredProfileIds,
  loadActiveProfile,
  generateSingleRequirementHtml,
  type RequirementProfile,
} from "./profile.js";

export type {
  ArtifactLinkRenderOptions,
  ArtifactRef,
  DiscoverResult,
  Link,
  LoadResult,
  ParameterValue,
  Requirement,
  RequirementSchemaComposeOptions,
  RequirementWithSource,
  ValidationError,
} from "./types.js";
