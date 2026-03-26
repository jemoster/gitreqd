/**
 * GRD-SYS-011: Canonical YAML serialization for requirement files (deterministic field order,
 * normalized indentation, stable stringify). Used by the format CLI (GRD-CLI-006).
 */
import { stringify } from "yaml";
import type { Link, ParameterValue, Requirement } from "./types.js";

function sortObjectKeysDeep(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortObjectKeysDeep);
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k] = sortObjectKeysDeep(obj[k]);
  }
  return out;
}

/** Satisfies first, then other keys alphabetically (stable, readable). */
function linkObjectForYaml(link: Link): Record<string, unknown> {
  const keys = Object.keys(link).filter((k) => link[k] !== undefined);
  const ordered: string[] = [];
  if (keys.includes("satisfies")) {
    ordered.push("satisfies");
  }
  const rest = keys.filter((k) => k !== "satisfies").sort((a, b) => a.localeCompare(b));
  ordered.push(...rest);
  const out: Record<string, unknown> = {};
  for (const k of ordered) {
    out[k] = link[k];
  }
  return out;
}

/**
 * Normalize text so two requirement files that differ only by line endings or trailing
 * whitespace compare equal (GRD-SYS-011 / GRD-CLI-006 skip-write check).
 */
export function normalizeRequirementFileTextForCompare(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const trimmedLines = lines.map((line) => line.replace(/[ \t]+$/u, ""));
  while (trimmedLines.length > 0 && trimmedLines[trimmedLines.length - 1] === "") {
    trimmedLines.pop();
  }
  return `${trimmedLines.join("\n")}\n`;
}

/**
 * Use block clip chomping (`|`) instead of strip (`|-`) for description and rationale so trailing
 * newlines in Markdown are not stripped on round-trip (consistent with GRD-VSC-006 preview writes).
 */
export function preferClipBlockChompForMarkdownKeys(yaml: string): string {
  return yaml.replace(/^([ \t]*(?:description|rationale):[ \t]*)\|-(\r?\n)/gm, "$1|$2");
}

/**
 * Serialize a validated requirement to canonical YAML. Omits empty optional sections.
 */
export function formatRequirementToYaml(requirement: Requirement): string {
  const doc: Record<string, unknown> = {
    id: requirement.id,
    title: requirement.title,
    description: requirement.description,
  };

  if (requirement.attributes !== undefined) {
    const sorted = sortObjectKeysDeep(requirement.attributes) as Record<string, unknown>;
    if (Object.keys(sorted).length > 0) {
      doc.attributes = sorted;
    }
  }

  if (requirement.links !== undefined && requirement.links.length > 0) {
    doc.links = requirement.links.map((link) => linkObjectForYaml(link));
  }

  if (requirement.parameters !== undefined) {
    const sorted = sortObjectKeysDeep(requirement.parameters) as Record<string, ParameterValue>;
    if (Object.keys(sorted).length > 0) {
      doc.parameters = sorted;
    }
  }

  return preferClipBlockChompForMarkdownKeys(stringify(doc, { lineWidth: 0, indent: 2 }));
}
