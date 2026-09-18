/**
 * Browser wasm-bindgen loader (--target web). Instantiation is async; await
 * `initShallgraphWasm()` before any other binding call.
 */
import init, * as wasm from "./wasm-web/shallgraph_wasm.js";
import type { WasmBindings } from "./wasm-types.js";

export type { WasmBindings };

let cached: WasmBindings | undefined;
let pending: Promise<WasmBindings> | undefined;

export async function initShallgraphWasm(moduleOrPath?: unknown): Promise<void> {
  if (cached) return;
  if (!pending) {
    pending = Promise.resolve(
      moduleOrPath === undefined ? init() : init({ module_or_path: moduleOrPath })
    ).then(() => {
      cached = wasm as unknown as WasmBindings;
      return cached;
    });
  }
  await pending;
}

export function loadWasmBindings(_explicitDir?: string): WasmBindings {
  if (!cached) {
    throw new Error(
      "shallgraph WASM is not initialized; await initShallgraphWasm() before parse, validate, or HTML helpers in the browser"
    );
  }
  return cached;
}

export function setWasmBindingsForTests(bindings: WasmBindings | undefined): void {
  cached = bindings;
  pending = undefined;
}
