import { parse as parseYaml } from "yaml";
import fs from "node:fs";
import { z } from "zod/v3";
import { requirementFileDataSchema } from "./requirement-schema.js";
import type { Requirement, RequirementWithSource } from "./types.js";
import type { ValidationError } from "./types.js";

/** GRD-SYS-009: Format Zod issues for CLI and conflict resolution messages. */
function formatRequirementParseError(err: z.ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Invalid requirement data";
  const prefix = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${prefix}${issue.message}`;
}

/**
 * Parse YAML object data with a profile-specific requirement schema (GRD-SYS-010).
 */
export function parseRequirementData(
  data: unknown,
  filePath: string,
  /** Input may be loose YAML (e.g. id as number); output is normalized Requirement. */
  schema: z.ZodType<Requirement, z.ZodTypeDef, unknown>
): { requirement: RequirementWithSource } | { error: ValidationError } {
  if (data == null || typeof data !== "object") {
    return { error: { path: filePath, message: "Expected an object" } };
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    return { error: { path: filePath, message: formatRequirementParseError(result.error) } };
  }

  return {
    requirement: { ...result.data, sourcePath: filePath },
  };
}

/**
 * Parse requirement YAML from a content string using the given Zod schema (GRD-SYS-010 profiles).
 */
export function parseRequirementContentWithSchema(
  content: string,
  filePath: string,
  schema: z.ZodType<Requirement, z.ZodTypeDef, unknown>
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
  return parseRequirementData(data, filePath, schema);
}

/**
 * Parse requirement YAML from a content string (e.g. for validating merged content).
 * GRD-GIT-002: used to validate resolved conflict content against schema before writing.
 */
export function parseRequirementContent(
  content: string,
  filePath: string
): { requirement: RequirementWithSource } | { error: ValidationError } {
  return parseRequirementContentWithSchema(content, filePath, requirementFileDataSchema);
}

/**
 * Parse a single requirement file using the given Zod schema (GRD-SYS-010 profiles).
 */
export function parseRequirementFileWithSchema(
  filePath: string,
  schema: z.ZodType<Requirement, z.ZodTypeDef, unknown>
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
  return parseRequirementData(data, filePath, schema);
}

/**
 * Parse a single requirement file. Returns a requirement or adds to errors.
 */
export function parseRequirementFile(
  filePath: string
): { requirement: RequirementWithSource } | { error: ValidationError } {
  return parseRequirementFileWithSchema(filePath, requirementFileDataSchema);
}
