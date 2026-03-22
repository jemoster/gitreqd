/**
 * GRD-SYS-009: Zod schema for requirement YAML — single source of truth for structure and validation.
 * GRD-SYS-005: parameters (string | number | boolean).
 * JSON Schema for editors (GRD-VSC-004) is exported from the same Zod definitions via zod-to-json-schema.
 */
import { z } from "zod/v3";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { Link, ParameterValue, Requirement } from "./types.js";

const yamlScalar = z.union([z.string(), z.number(), z.boolean()]);

function normalizeLinks(links: unknown): Link[] | undefined {
  if (links == null) return undefined;
  if (!Array.isArray(links)) return undefined;
  return links.map((item) => {
    if (item && typeof item === "object" && !Array.isArray(item) && "satisfies" in item) {
      return { satisfies: String((item as { satisfies: unknown }).satisfies) };
    }
    return item as Link;
  });
}

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
 * Requirement file shape after YAML parse, before link/parameter normalization.
 * Used for runtime validation and for JSON Schema export (GRD-SYS-009).
 */
export const requirementFileInnerSchema = z
  .object({
    id: yamlScalar
      .transform(String)
      .transform((s) => s.trim())
      .pipe(
        z
          .string()
          .min(1, { message: "Missing required field: id" })
          .describe("Unique requirement identifier (e.g. GRD-HTML-001). Must match the filename without extension.")
      ),
    title: yamlScalar
      .transform(String)
      .transform((s) => s.trim())
      .pipe(
        z
          .string()
          .min(1, { message: "Missing required field: title" })
          .describe("Short title of the requirement.")
      ),
    description: z
      .union([yamlScalar, z.null()])
      .optional()
      .transform((v) => (v === undefined || v === null ? "" : String(v)))
      .describe("Full description of the requirement. Supports Markdown in HTML report output."),
    attributes: z
      .record(z.unknown())
      .optional()
      .describe("Optional key-value attributes (e.g. status, rationale)."),
    links: z
      .array(z.record(z.unknown()))
      .optional()
      .describe("Optional list of link objects (e.g. satisfies)."),
    parameters: z
      .record(z.unknown())
      .optional()
      .describe("Named parameters for templating in text fields (string, number, or boolean values)."),
  })
  .strict();

export type RequirementFileInner = z.output<typeof requirementFileInnerSchema>;

/**
 * Fully normalized requirement (trimmed ids, normalized links and parameters).
 * Output matches `Requirement` (optional keys omitted when unset).
 */
export const requirementFileDataSchema = requirementFileInnerSchema.transform((data): Requirement => {
  const out: Requirement = {
    id: data.id,
    title: data.title,
    description: data.description,
  };
  if (data.attributes !== undefined) out.attributes = data.attributes;
  const links = normalizeLinks(data.links);
  if (links !== undefined) out.links = links;
  const parameters = normalizeParameters(data.parameters);
  if (parameters !== undefined) out.parameters = parameters;
  return out;
});

/**
 * Optional inputs when the JSON Schema must reflect project runtime configuration (GRD-SYS-009).
 * Extend when `gitreqd.yaml` or other config affects composed fields.
 */
export interface RequirementSchemaComposeOptions {
  // reserved for future use
}

/** Export JSON Schema (draft-7 compatible) for VS Code YAML validation and other consumers. */
export function exportRequirementFileJsonSchema(
  _options?: RequirementSchemaComposeOptions
): Record<string, unknown> {
  const raw = zodToJsonSchema(requirementFileInnerSchema, {
    name: "GitreqdRequirement",
    $refStrategy: "none",
  }) as Record<string, unknown>;
  const definitions = raw.definitions as Record<string, unknown> | undefined;
  const inner = definitions?.GitreqdRequirement as Record<string, unknown> | undefined;
  const base = inner ?? raw;
  return {
    ...base,
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Gitreqd requirement",
    description:
      "YAML format for a single requirement file (id, title, description, attributes, links). GRD-VSC-004.",
  };
}
