import { parse as parseYaml } from "yaml";
import fs from "node:fs";
import type { ParameterValue, Requirement } from "./types.js";
import type { RequirementWithSource } from "./types.js";
import type { ValidationError } from "./types.js";

function normalizeLinks(links: unknown): Requirement["links"] {
  if (links == null) return undefined;
  if (!Array.isArray(links)) return undefined;
  return links.map((item) => {
    if (item && typeof item === "object" && "satisfies" in item) {
      return { satisfies: String((item as { satisfies: unknown }).satisfies) };
    }
    return item as Requirement["links"] extends (infer T)[] ? T : never;
  });
}

/** GRD-SYS-005: Normalize parameters to Record<string, ParameterValue>. */
function normalizeParameters(parameters: unknown): Record<string, ParameterValue> | undefined {
  if (parameters == null || typeof parameters !== "object" || Array.isArray(parameters)) return undefined;
  const out: Record<string, ParameterValue> = {};
  for (const [k, v] of Object.entries(parameters as Record<string, unknown>)) {
    if (typeof k !== "string" || !k.trim()) continue;
    if (v === null || v === undefined) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Parse requirement YAML from a content string (e.g. for validating merged content).
 * GRD-GIT-002: used to validate resolved conflict content against schema before writing.
 */
export function parseRequirementContent(
  content: string,
  filePath: string
): { requirement: RequirementWithSource } | { error: ValidationError } {
  let data: unknown;
  try {
    data = parseYaml(content);
  } catch (err) {
    const line = err && typeof err === "object" && "line" in err ? (err as { line: number }).line : undefined;
    return {
      error: { path: filePath, message: String(err), line },
    };
  }
  return parseRequirementData(data, filePath);
}

/**
 * Parse a single requirement file. Returns a requirement or adds to errors.
 */
export function parseRequirementFile(
  filePath: string
): { requirement: RequirementWithSource } | { error: ValidationError } {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    return {
      error: { path: filePath, message: String(err) },
    };
  }
  let data: unknown;
  try {
    data = parseYaml(raw);
  } catch (err) {
    const line = err && typeof err === "object" && "line" in err ? (err as { line: number }).line : undefined;
    return {
      error: { path: filePath, message: String(err), line },
    };
  }
  return parseRequirementData(data, filePath);
}

function parseRequirementData(
  data: unknown,
  filePath: string
): { requirement: RequirementWithSource } | { error: ValidationError } {

  if (data == null || typeof data !== "object") {
    return { error: { path: filePath, message: "Expected an object" } };
  }

  const obj = data as Record<string, unknown>;
  const id = obj.id != null ? String(obj.id) : undefined;
  const title = obj.title != null ? String(obj.title) : undefined;
  const description = obj.description != null ? String(obj.description) : undefined;

  if (!id) {
    return { error: { path: filePath, message: "Missing required field: id" } };
  }
  if (!title) {
    return { error: { path: filePath, message: "Missing required field: title" } };
  }

  // GRD-SYS-005: Parse parameters (name -> string | number | boolean)
  const parameters = normalizeParameters(obj.parameters);

  const requirement: Requirement = {
    id,
    title,
    description: description ?? "",
    attributes: typeof obj.attributes === "object" && obj.attributes !== null ? (obj.attributes as Record<string, unknown>) : undefined,
    links: normalizeLinks(obj.links),
    parameters: parameters && Object.keys(parameters).length > 0 ? parameters : undefined,
  };

  return {
    requirement: { ...requirement, sourcePath: filePath },
  };
}
