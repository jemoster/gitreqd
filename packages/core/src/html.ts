/**
 * Node-free HTML renderer. Import `@gitreqd/core/html` from browser bundles so
 * webpack/Next never trace `fs-adapter` (`glob`, `node:fs`).
 *
 * In the browser, await `initGitreqdWasm()` once before calling
 * `generateSingleRequirementHtml`. After init the renderer is synchronous.
 */
import type { ArtifactLinkRenderOptions, RequirementWithSource } from "./types.js";
import {
  generateSingleRequirementHtmlRaw,
  stampEditableFieldMarkers,
} from "./engine.js";

export { initGitreqdWasm, loadWasmBindings } from "./wasm.js";
export type { WasmBindings } from "./wasm-types.js";
export { stampEditableFieldMarkers } from "./engine.js";

export type SingleRequirementHtmlOptions = {
  editableFieldMarkers?: boolean;
  artifactLinks?: ArtifactLinkRenderOptions;
};

export function generateSingleRequirementHtml(
  requirement: RequirementWithSource,
  allRequirements?: RequirementWithSource[],
  options?: SingleRequirementHtmlOptions
): string {
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
}
