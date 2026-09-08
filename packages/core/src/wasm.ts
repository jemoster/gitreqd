/**
 * Load gitreqd-core WASM via a static specifier so Node and bundlers resolve
 * `dist/wasm/gitreqd_wasm.js` relative to this module, not `process.cwd()`.
 *
 * Browser bundles remap this file to `wasm.browser.js` (see package.json
 * `browser` and the `./wasm` export conditions).
 */
import * as wasm from "./wasm/gitreqd_wasm.js";
import type { WasmBindings } from "./wasm-types.js";

export type { WasmBindings };

let cached: WasmBindings | undefined = wasm;

/**
 * Node glue is already instantiated. This matches the browser API so callers
 * can `await initGitreqdWasm()` on every host.
 */
export async function initGitreqdWasm(_moduleOrPath?: unknown): Promise<void> {
  if (!cached) {
    cached = wasm;
  }
}

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
