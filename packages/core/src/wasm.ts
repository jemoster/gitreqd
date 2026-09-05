/**
 * Load gitreqd-core WASM via a static specifier so Node and bundlers resolve
 * `dist/wasm/gitreqd_wasm.js` relative to this module, not `process.cwd()`.
 */
import * as wasm from "./wasm/gitreqd_wasm.js";

export interface WasmBindings {
  requirementFileExtension(): string;
  isRequirementFilename(basename: string): boolean;
  requirementIdFromFilename(basename: string): string | undefined;
  parseRequirementContent(yaml: string, path: string): string;
  validateRequirements(requirementsJson: string): string;
  formatRequirementToYaml(requirementJson: string): string;
  exportRequirementFileJsonSchema(composeJson?: string | null): string;
  generateSingleRequirementHtml(
    requirementJson: string,
    allJson?: string | null,
    artifactLinksJson?: string | null
  ): string;
  parseRootMarker(yaml: string, markerLabel: string): string;
  standardProfileId(): string;
  listRegisteredProfileIds(): string;
  hasRequirementProfile(id: string): boolean;
}

let cached: WasmBindings | undefined = wasm;

/**
 * Return the wasm-bindgen Node bindings. `explicitDir` is ignored: the glue is
 * imported from `./wasm/gitreqd_wasm.js` next to this module (see dist/wasm/).
 */
export function loadWasmBindings(_explicitDir?: string): WasmBindings {
  if (!cached) {
    cached = wasm;
  }
  return cached;
}

export function setWasmBindingsForTests(bindings: WasmBindings | undefined): void {
  cached = bindings;
}
