/**
 * GRD-GIT-002: Merge-conflict resolution for requirement YAML files.
 * Reconstructs ours/theirs, compares title/description/rationale, uses LLM to merge differing fields,
 * and validates resolved content against the requirement schema before any write.
 */
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { getRequirementProfile, STANDARD_PROFILE_ID } from "./profile/registry.js";
import type { RequirementProfile } from "./profile/types.js";
import type { ValidationError } from "./types.js";

const CONFLICT_START = /^<<<<<<< .+$/m;
const CONFLICT_SEP = /^=======$/m;
const CONFLICT_END = /^>>>>>>> .+$/m;

export interface OllamaConfig {
  base_url: string;
  model: string;
}

export interface ResolveResult {
  resolved: string;
}

/** Injected merge function for a single field (e.g. for tests without calling the real LLM). */
export type MergeFieldFn = (
  fieldName: "title" | "description" | "rationale",
  oursYaml: string,
  theirsYaml: string,
  config: OllamaConfig
) => Promise<string>;

export interface ResolveRequirementConflictsOptions {
  /** When set, used instead of calling the LLM. Enables testing without network or logging. */
  mergeField?: MergeFieldFn;
  /** GRD-SYS-010: Profile used to validate merged YAML (defaults to standard). */
  profile?: RequirementProfile;
}

/**
 * Reconstruct full file content for "ours" by replacing each conflict region with the first side.
 * Reconstruct "theirs" with the second side. Returns null if content has no valid conflict markers.
 */
export function reconstructSides(content: string): { ours: string; theirs: string } | null {
  const parts: { before: string; ours: string; theirs: string; after: string }[] = [];
  let rest = content;
  let hadConflict = false;

  while (rest.length > 0) {
    const startMatch = rest.match(CONFLICT_START);
    if (!startMatch || startMatch.index == null) {
      parts.push({ before: rest, ours: "", theirs: "", after: "" });
      break;
    }
    hadConflict = true;
    const before = rest.slice(0, startMatch.index);
    rest = rest.slice(startMatch.index + startMatch[0].length);

    const sepMatch = rest.match(CONFLICT_SEP);
    if (!sepMatch || sepMatch.index == null) {
      return null;
    }
    const ours = rest.slice(0, sepMatch.index).trimEnd();
    rest = rest.slice(sepMatch.index + sepMatch[0].length);

    const endMatch = rest.match(CONFLICT_END);
    if (!endMatch || endMatch.index == null) {
      return null;
    }
    const theirs = rest.slice(0, endMatch.index).trimEnd();
    const after = rest.slice(endMatch.index + endMatch[0].length);
    const afterTrim = after.startsWith("\n") ? after.slice(1) : after;
    parts.push({ before, ours, theirs, after: afterTrim });
    rest = afterTrim;
  }

  if (!hadConflict) return null;

  const last = parts[parts.length - 1]!;
  const joinAfter = last.after ? "\n" + last.after : "";
  const oursFull = parts.map((p) => p.before + p.ours).join("\n") + joinAfter;
  const theirsFull = parts.map((p) => p.before + p.theirs).join("\n") + joinAfter;

  return { ours: oursFull, theirs: theirsFull };
}

function getTextFields(obj: Record<string, unknown>): {
  title: string;
  description: string;
  rationale: string;
} {
  const title = obj.title != null ? String(obj.title) : "";
  const description = obj.description != null ? String(obj.description) : "";
  const attrs = obj.attributes;
  const rationale =
    attrs && typeof attrs === "object" && (attrs as Record<string, unknown>).rationale != null
      ? String((attrs as Record<string, unknown>).rationale)
      : "";
  return { title, description, rationale };
}

/** When set (e.g. 1 or true), log LLM request and response to stderr. */
const LLM_LOG_ENV = "GITREQD_LOG_LLM";

function shouldLogLLM(): boolean {
  const v = process.env[LLM_LOG_ENV];
  return v === "1" || v === "true" || v === "yes";
}

/** JSON schema for LLM merge response. Enables deterministic extraction without string stripping. */
const MERGE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    merged_value: { type: "string", description: "The intelligently merged text for the field" },
  },
  required: ["merged_value"],
  additionalProperties: false,
} as const;

/**
 * Call Ollama to merge a single text field. Uses structured JSON output so the merged value is extracted deterministically.
 */
async function mergeFieldWithLLM(
  fieldName: "title" | "description" | "rationale",
  oursYaml: string,
  theirsYaml: string,
  config: OllamaConfig
): Promise<string> {
  const prompt = `You are merging the "${fieldName}" field from two versions of a requirement (YAML). Produce a single merged value that combines both versions intelligently: preserve important content from both sides, resolve contradictions in a sensible way, and write clear combined text. Do not simply concatenate the two versions.

Respond with a JSON object containing exactly one key "merged_value" whose value is the merged text (string). No other keys or commentary.

Version OURS (current branch):
\`\`\`yaml
${oursYaml}
\`\`\`

Version THEIRS (incoming branch):
\`\`\`yaml
${theirsYaml}
\`\`\`

Return JSON: { "merged_value": "<your merged ${fieldName} here>" }`;

  const url = config.base_url.replace(/\/$/, "") + "/api/generate";
  const body = {
    model: config.model,
    prompt,
    stream: false,
    format: MERGE_RESPONSE_SCHEMA,
    options: { temperature: 0 },
  };

  if (shouldLogLLM()) {
    console.error("[gitreqd resolve-conflicts] LLM request:", JSON.stringify({ field: fieldName, promptLength: prompt.length, prompt: prompt }, null, 2));
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (shouldLogLLM()) {
      console.error("[gitreqd resolve-conflicts] LLM HTTP error:", res.status, text);
    }
    throw new Error(`Ollama request failed ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { response?: string };
  const rawResponse = json.response;
  if (shouldLogLLM()) {
    console.error("[gitreqd resolve-conflicts] LLM raw response:", typeof rawResponse === "string" ? rawResponse : JSON.stringify(rawResponse));
  }

  if (typeof rawResponse !== "string") {
    throw new Error("Ollama response missing 'response' string");
  }

  let parsed: { merged_value?: string };
  try {
    parsed = JSON.parse(rawResponse.trim()) as { merged_value?: string };
  } catch (err) {
    if (shouldLogLLM()) {
      console.error("[gitreqd resolve-conflicts] LLM response is not valid JSON:", rawResponse);
    }
    throw new Error(`LLM did not return valid JSON: ${String(err)}`);
  }

  if (parsed == null || typeof parsed.merged_value !== "string") {
    if (shouldLogLLM()) {
      console.error("[gitreqd resolve-conflicts] LLM JSON missing merged_value:", parsed);
    }
    throw new Error("LLM JSON must contain string key 'merged_value'");
  }

  if (shouldLogLLM()) {
    console.error("[gitreqd resolve-conflicts] LLM extracted merged_value length:", parsed.merged_value.length, "preview:", parsed.merged_value.slice(0, 80) + (parsed.merged_value.length > 80 ? "..." : ""));
  }
  return parsed.merged_value;
}

/**
 * GRD-GIT-002: Resolve merge conflicts in requirement file content using LLM.
 * Reconstructs ours/theirs, compares title/description/rationale; for differing fields calls LLM (or options.mergeField if provided).
 * Resolved content is validated against the requirement schema; on validation failure no changes are made.
 */
export async function resolveRequirementConflicts(
  content: string,
  filePath: string,
  ollamaConfig: OllamaConfig,
  options?: ResolveRequirementConflictsOptions
): Promise<ResolveResult | { error: ValidationError }> {
  const sides = reconstructSides(content);
  if (!sides) {
    return { error: { path: filePath, message: "No valid conflict markers found" } };
  }

  let oursObj: Record<string, unknown>;
  let theirsObj: Record<string, unknown>;
  try {
    oursObj = parseYaml(sides.ours) as Record<string, unknown>;
    theirsObj = parseYaml(sides.theirs) as Record<string, unknown>;
  } catch (err) {
    return { error: { path: filePath, message: `Invalid YAML in conflict sides: ${String(err)}` } };
  }

  if (oursObj == null || typeof oursObj !== "object" || theirsObj == null || typeof theirsObj !== "object") {
    return { error: { path: filePath, message: "Parsed conflict sides are not objects" } };
  }

  const oFields = getTextFields(oursObj);
  const tFields = getTextFields(theirsObj);

  const mergeField = options?.mergeField ?? mergeFieldWithLLM;

  // GRD-GIT-002: Build merged explicitly so no top-level or attribute keys are lost.
  const oursAttrs = oursObj.attributes && typeof oursObj.attributes === "object" ? (oursObj.attributes as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = {
    id: oursObj.id,
    title: oursObj.title,
    description: oursObj.description,
    attributes: { ...oursAttrs },
    ...(oursObj.links !== undefined && { links: oursObj.links }),
  };
  const attrs = { ...oursAttrs };

  if (oFields.title !== tFields.title) {
    merged.title = await mergeField("title", sides.ours, sides.theirs, ollamaConfig);
  }
  if (oFields.description !== tFields.description) {
    merged.description = await mergeField("description", sides.ours, sides.theirs, ollamaConfig);
  }
  if (oFields.rationale !== tFields.rationale) {
    attrs.rationale = await mergeField("rationale", sides.ours, sides.theirs, ollamaConfig);
  }
  merged.attributes = Object.keys(attrs).length > 0 ? attrs : undefined;

  const resolvedYaml = stringifyYaml(merged, { lineWidth: 0 });
  const profile = options?.profile ?? getRequirementProfile(STANDARD_PROFILE_ID);
  const parsed = profile.parseRequirementContent(resolvedYaml, filePath);
  if ("error" in parsed) {
    return { error: parsed.error };
  }
  return { resolved: resolvedYaml };
}

/**
 * Returns true if the file content contains Git conflict markers.
 */
export function hasConflictMarkers(content: string): boolean {
  return CONFLICT_START.test(content) && CONFLICT_SEP.test(content) && CONFLICT_END.test(content);
}
