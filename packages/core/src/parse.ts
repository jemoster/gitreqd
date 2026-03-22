import { parse as parseYaml } from "yaml";
import fs from "node:fs";
import { z } from "zod/v3";
import { requirementFileDataSchema } from "./requirement-schema.js";
import type { RequirementWithSource } from "./types.js";
import type { ValidationError } from "./types.js";

/** GRD-SYS-009: Format Zod issues for CLI and conflict resolution messages. */
function formatRequirementParseError(err: z.ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Invalid requirement data";
  const prefix = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${prefix}${issue.message}`;
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

  const result = requirementFileDataSchema.safeParse(data);
  if (!result.success) {
    return { error: { path: filePath, message: formatRequirementParseError(result.error) } };
  }

  return {
    requirement: { ...result.data, sourcePath: filePath },
  };
}
