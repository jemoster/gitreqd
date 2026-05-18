/**
 * Migrate legacy `description` field to `require` + `refinement` (GRD-SYS-015).
 * Heuristic: first paragraph/sentence with shall > should > may becomes require; remainder is refinement.
 */
import type { Requirement } from "./types.js";

const RFC2119_PATTERN = /\b(shall|should|may)\b/i;

export type MigrateAmbiguityReason =
  | "empty_description"
  | "no_rfc2119_keyword"
  | "multiple_rfc2119_in_require";

export interface MigrateDescriptionResult {
  requirement: Omit<Requirement, "sourcePath">;
  ambiguity?: MigrateAmbiguityReason;
}

function countRfc2119Keywords(text: string): number {
  const matches = text.match(/\b(shall|should|may)\b/gi);
  return matches?.length ?? 0;
}

function keywordPriority(text: string): number {
  const lower = text.toLowerCase();
  if (/\bshall\b/.test(lower)) return 0;
  if (/\bshould\b/.test(lower)) return 1;
  if (/\bmay\b/.test(lower)) return 2;
  return 3;
}

/** Split description into candidate units (paragraphs, then sentences). */
function splitUnits(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const units: string[] = [];
  for (const para of paragraphs) {
    const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      units.push(...lines);
      continue;
    }
    const sentences = para.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length > 1) {
      units.push(...sentences);
    } else {
      units.push(para);
    }
  }
  return units;
}

function selectRequireUnit(units: string[]): string | null {
  const withKeyword = units.filter((u) => RFC2119_PATTERN.test(u));
  if (withKeyword.length === 0) return null;
  const sorted = [...withKeyword].sort((a, b) => keywordPriority(a) - keywordPriority(b));
  return sorted[0] ?? null;
}

/**
 * Convert a legacy requirement object (with `description`) to require + refinement.
 */
export function migrateDescriptionToRequire(legacy: {
  id: string;
  title: string;
  description?: string | null;
  require?: string;
  refinement?: string;
  attributes?: Record<string, unknown>;
  links?: Requirement["links"];
  satisfied_by?: Requirement["satisfied_by"];
  verified_by?: Requirement["verified_by"];
  parameters?: Requirement["parameters"];
}): MigrateDescriptionResult {
  if (legacy.require != null && legacy.require !== "") {
    const requirement: Requirement = {
      id: legacy.id,
      title: legacy.title,
      require: String(legacy.require).trim(),
      refinement: legacy.refinement != null ? String(legacy.refinement) : "",
    };
    if (legacy.attributes !== undefined) requirement.attributes = legacy.attributes;
    if (legacy.links !== undefined) requirement.links = legacy.links;
    if (legacy.satisfied_by !== undefined) requirement.satisfied_by = legacy.satisfied_by;
    if (legacy.verified_by !== undefined) requirement.verified_by = legacy.verified_by;
    if (legacy.parameters !== undefined) requirement.parameters = legacy.parameters;
    const ambiguity =
      countRfc2119Keywords(requirement.require) === 0
        ? "no_rfc2119_keyword"
        : countRfc2119Keywords(requirement.require) > 1
          ? "multiple_rfc2119_in_require"
          : undefined;
    return { requirement, ambiguity };
  }

  const desc =
    legacy.description === undefined || legacy.description === null
      ? ""
      : String(legacy.description).trim();

  if (!desc) {
    return {
      requirement: {
        id: legacy.id,
        title: legacy.title,
        require: "",
        refinement: "",
        ...(legacy.attributes !== undefined && { attributes: legacy.attributes }),
        ...(legacy.links !== undefined && { links: legacy.links }),
        ...(legacy.satisfied_by !== undefined && { satisfied_by: legacy.satisfied_by }),
        ...(legacy.verified_by !== undefined && { verified_by: legacy.verified_by }),
        ...(legacy.parameters !== undefined && { parameters: legacy.parameters }),
      },
      ambiguity: "empty_description",
    };
  }

  const units = splitUnits(desc);
  const requireUnit = selectRequireUnit(units.length > 0 ? units : [desc]);

  if (!requireUnit) {
    return {
      requirement: {
        id: legacy.id,
        title: legacy.title,
        require: desc,
        refinement: "",
        ...(legacy.attributes !== undefined && { attributes: legacy.attributes }),
        ...(legacy.links !== undefined && { links: legacy.links }),
        ...(legacy.satisfied_by !== undefined && { satisfied_by: legacy.satisfied_by }),
        ...(legacy.verified_by !== undefined && { verified_by: legacy.verified_by }),
        ...(legacy.parameters !== undefined && { parameters: legacy.parameters }),
      },
      ambiguity: "no_rfc2119_keyword",
    };
  }

  const requireText = requireUnit.trim();
  const remainingUnits = units.filter((u) => u.trim() !== requireUnit.trim());
  const refinementText = remainingUnits.join("\n\n").trim();

  let ambiguity: MigrateAmbiguityReason | undefined;
  if (countRfc2119Keywords(requireText) === 0) {
    ambiguity = "no_rfc2119_keyword";
  } else if (countRfc2119Keywords(requireText) > 1) {
    ambiguity = "multiple_rfc2119_in_require";
  }

  const requirement: Requirement = {
    id: legacy.id,
    title: legacy.title,
    require: requireText,
    refinement: refinementText,
  };
  if (legacy.attributes !== undefined) requirement.attributes = legacy.attributes;
  if (legacy.links !== undefined) requirement.links = legacy.links;
  if (legacy.satisfied_by !== undefined) requirement.satisfied_by = legacy.satisfied_by;
  if (legacy.verified_by !== undefined) requirement.verified_by = legacy.verified_by;
  if (legacy.parameters !== undefined) requirement.parameters = legacy.parameters;

  return { requirement, ambiguity };
}

export function hasLegacyDescriptionField(obj: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(obj, "description");
}
