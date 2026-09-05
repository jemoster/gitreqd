import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

let cached: WasmBindings | undefined;

function moduleDir(): string {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    const cjsDir = (globalThis as { __dirname?: string }).__dirname;
    if (cjsDir) return cjsDir;
    return process.cwd();
  }
}

function existingFile(candidates: string[]): string | undefined {
  return candidates.find((p) => fs.existsSync(p));
}

/**
 * Load wasm-bindgen Node bindings. `explicitDir` is the directory that contains
 * `gitreqd_wasm.js` and `gitreqd_wasm_bg.wasm`.
 */
export function loadWasmBindings(explicitDir?: string): WasmBindings {
  if (cached) return cached;
  const here = moduleDir();
  const jsPath = existingFile(
    [
      explicitDir ? path.join(explicitDir, "gitreqd_wasm.js") : "",
      process.env.GITREQD_WASM_DIR ? path.join(process.env.GITREQD_WASM_DIR, "gitreqd_wasm.js") : "",
      path.join(here, "wasm", "gitreqd_wasm.js"),
      path.join(here, "..", "wasm", "gitreqd_wasm.js"),
      path.join(process.cwd(), "packages", "core", "wasm", "gitreqd_wasm.js"),
    ].filter(Boolean)
  );
  if (!jsPath) {
    throw new Error("gitreqd WASM bindings not found; run scripts/build-wasm-core.sh");
  }
  const req = createRequire(jsPath);
  cached = req(jsPath) as WasmBindings;
  return cached;
}

export function setWasmBindingsForTests(bindings: WasmBindings | undefined): void {
  cached = bindings;
}
