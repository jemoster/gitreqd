/**
 * GRD-SYS-012: External LLM provider configuration from the project root marker.
 * GRD-SYS-013: Claude (Anthropic) provider fields and validation.
 * GRD-SYS-014: Ollama provider fields, connectivity, and model availability.
 */
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { findRootMarkerPath, ROOT_MARKER_HINT } from "./discovery.js";

/** Documented default when `model` is omitted for Claude (GRD-SYS-013). Snapshot id for Claude Sonnet 4 (Anthropic API). */
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";

const DEFAULT_ANTHROPIC_BASE = "https://api.anthropic.com";

/** GRD-SYS-014: default when `base_url` is omitted for Ollama. */
export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

export type LlmRuntimeConfig =
  | { provider: "ollama"; base_url: string; model: string }
  | {
      provider: "claude";
      base_url: string;
      model: string;
      /** Name of the environment variable holding the Anthropic API key (read at request time). */
      api_key_env: string;
    };

export type ParseLlmConfigResult =
  | { ok: true; config: LlmRuntimeConfig; markerPath: string }
  | { ok: false; message: string; markerPath?: string };

const OLLAMA_KNOWN = new Set(["provider", "model", "base_url"]);
const CLAUDE_KNOWN = new Set(["provider", "api_key_env", "model", "base_url"]);

function warnUnknownKeys(
  block: Record<string, unknown>,
  known: Set<string>,
  warn: ((msg: string) => void) | undefined
): void {
  if (warn == null) return;
  for (const key of Object.keys(block)) {
    if (!known.has(key)) {
      warn(`Unknown key in llm configuration: "${key}"`);
    }
  }
}

/**
 * Read and validate `llm` from the project root marker. Does not perform network checks;
 * use {@link validateLlmForUse} before LLM-backed operations.
 */
export function parseLlmConfig(
  projectRoot: string,
  options?: { warn?: (message: string) => void }
): ParseLlmConfigResult {
  const rootPath = findRootMarkerPath(projectRoot);
  if (rootPath === null) {
    return { ok: false, message: `Failed to find ${ROOT_MARKER_HINT} under ${path.resolve(projectRoot)}` };
  }
  let raw: string;
  try {
    raw = fs.readFileSync(rootPath, "utf-8");
  } catch (err) {
    return { ok: false, message: `Failed to read ${path.basename(rootPath)}: ${String(err)}`, markerPath: rootPath };
  }
  let data: unknown;
  try {
    data = parseYaml(raw);
  } catch (err) {
    return { ok: false, message: `Failed to parse ${path.basename(rootPath)}: ${String(err)}`, markerPath: rootPath };
  }
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, message: `Invalid ${path.basename(rootPath)}: expected a mapping at top level`, markerPath: rootPath };
  }
  const obj = data as Record<string, unknown>;
  const llm = obj.llm;
  if (llm == null) {
    return {
      ok: false,
      message: `Missing "llm" configuration in ${path.basename(rootPath)} (expected llm.provider and provider-specific settings)`,
      markerPath: rootPath,
    };
  }
  if (typeof llm !== "object" || llm === null || Array.isArray(llm)) {
    return { ok: false, message: `"llm" must be a mapping`, markerPath: rootPath };
  }
  const block = llm as Record<string, unknown>;
  const provider = block.provider;
  if (typeof provider !== "string" || provider.trim() === "") {
    return { ok: false, message: `"llm.provider" must be a non-empty string`, markerPath: rootPath };
  }

  if (provider === "ollama") {
    warnUnknownKeys(block, OLLAMA_KNOWN, options?.warn);
    const model = block.model;
    if (typeof model !== "string" || model.trim() === "") {
      return { ok: false, message: `"llm.model" is required when llm.provider is ollama`, markerPath: rootPath };
    }
    let base_url = DEFAULT_OLLAMA_BASE_URL;
    if (block.base_url !== undefined) {
      if (typeof block.base_url !== "string" || block.base_url.trim() === "") {
        return { ok: false, message: `"llm.base_url" must be a non-empty string when set`, markerPath: rootPath };
      }
      base_url = block.base_url.trim();
    }
    return {
      ok: true,
      markerPath: rootPath,
      config: { provider: "ollama", base_url, model: model.trim() },
    };
  }

  if (provider === "claude") {
    warnUnknownKeys(block, CLAUDE_KNOWN, options?.warn);
    const api_key_env = block.api_key_env;
    if (typeof api_key_env !== "string" || api_key_env.trim() === "") {
      return {
        ok: false,
        message: `"llm.api_key_env" is required when llm.provider is claude (name of environment variable holding the API key)`,
        markerPath: rootPath,
      };
    }
    const envName = api_key_env.trim();
    let base_url = DEFAULT_ANTHROPIC_BASE;
    if (block.base_url !== undefined) {
      if (typeof block.base_url !== "string" || block.base_url.trim() === "") {
        return { ok: false, message: `"llm.base_url" must be a non-empty string when set`, markerPath: rootPath };
      }
      base_url = block.base_url.trim().replace(/\/$/, "");
    }
    const model =
      typeof block.model === "string" && block.model.trim() !== ""
        ? block.model.trim()
        : DEFAULT_CLAUDE_MODEL;
    return {
      ok: true,
      markerPath: rootPath,
      config: {
        provider: "claude",
        base_url,
        model,
        api_key_env: envName,
      },
    };
  }

  return {
    ok: false,
    message: `Unsupported llm.provider "${provider}" (supported: ollama, claude)`,
    markerPath: rootPath,
  };
}

/** Whether any tag from Ollama lists `requested` as a full name or base name. */
export function ollamaModelMatchesTag(requested: string, tagName: string): boolean {
  const r = requested.trim();
  const t = tagName.trim();
  if (t === r) return true;
  if (t.startsWith(r + ":")) return true;
  const base = t.includes(":") ? t.slice(0, t.indexOf(":")) : t;
  return base === r;
}

/**
 * GRD-SYS-014: Ollama reachable and model present. GRD-SYS-013: API key already checked in parse.
 */
export async function validateLlmForUse(config: LlmRuntimeConfig): Promise<{ ok: true } | { ok: false; message: string }> {
  if (config.provider === "claude") {
    const v = process.env[config.api_key_env];
    if (v == null || String(v).trim() === "") {
      return {
        ok: false,
        message: `Anthropic API key is missing: environment variable "${config.api_key_env}" is unset or empty`,
      };
    }
    return { ok: true };
  }

  const base = config.base_url.replace(/\/$/, "");
  const tagsUrl = `${base}/api/tags`;
  let res: Response;
  try {
    res = await fetch(tagsUrl, { method: "GET" });
  } catch (err) {
    return {
      ok: false,
      message: `Cannot reach Ollama at ${base} (${tagsUrl}): ${String(err)}`,
    };
  }
  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false,
      message: `Cannot reach Ollama at ${base}: HTTP ${res.status}${text ? `: ${text.slice(0, 500)}` : ""}`,
    };
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, message: `Ollama at ${base} returned a non-JSON response from /api/tags` };
  }
  const models = body && typeof body === "object" && body !== null && "models" in body ? (body as { models?: unknown }).models : undefined;
  if (!Array.isArray(models)) {
    return { ok: false, message: `Ollama at ${base}: unexpected /api/tags response (missing models array)` };
  }
  const names: string[] = [];
  for (const m of models) {
    if (m && typeof m === "object" && "name" in m && typeof (m as { name: unknown }).name === "string") {
      names.push((m as { name: string }).name);
    }
  }
  const found = names.some((n) => ollamaModelMatchesTag(config.model, n));
  if (!found) {
    const list = names.length > 0 ? names.join(", ") : "(none reported)";
    return {
      ok: false,
      message: `Ollama model "${config.model}" is not available at ${base}. Available models: ${list}`,
    };
  }
  return { ok: true };
}
