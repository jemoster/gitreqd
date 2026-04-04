import fs from "node:fs";
import {
  formatRequirementToYaml,
  generateSingleRequirementHtml,
  loadRequirements,
} from "@gitreqd/core";
import type { Requirement, RequirementWithSource } from "@gitreqd/core";
import { getGitreqdProjectRoot } from "./project-root";

/** GRD-API-001: Shared REST payload and file mutations for Route Handlers. */

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function requirementPayloadForYaml(r: RequirementWithSource): Requirement {
  const payload: Requirement = {
    id: r.id,
    title: r.title,
    description: r.description,
  };
  if (r.attributes !== undefined) payload.attributes = r.attributes;
  if (r.links !== undefined) payload.links = r.links;
  if (r.parameters !== undefined) payload.parameters = r.parameters;
  return payload;
}

export function toApiRequirement(req: RequirementWithSource): Record<string, unknown> {
  return {
    id: req.id,
    title: req.title,
    category: req.categoryPath ?? [],
    description: req.description,
    attributes: req.attributes ?? {},
    links: req.links ?? [],
    parameters: req.parameters ?? {},
    sourcePath: req.sourcePath,
  };
}

export function extractBodyHtml(htmlDoc: string): string {
  const match = htmlDoc.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1].trim() : htmlDoc;
}

export async function loadProjectRequirements() {
  const root = getGitreqdProjectRoot();
  return loadRequirements(root, root);
}

export async function patchRequirementLinks(
  id: string,
  operation: "add" | "remove",
  link: Record<string, unknown>
): Promise<{ ok: true; requirement: RequirementWithSource } | { ok: false; code: string; message: string }> {
  const root = getGitreqdProjectRoot();
  const { requirements } = await loadRequirements(root, root);
  const target = requirements.find((r) => r.id === id);
  if (!target) {
    return { ok: false, code: "NOT_FOUND", message: `Requirement not found: ${id}` };
  }

  const nextLinks = [...(target.links ?? [])];
  const targetKey = stableStringify(link);
  if (operation === "add") {
    nextLinks.push(link);
  } else {
    const idx = nextLinks.findIndex((entry) => stableStringify(entry) === targetKey);
    if (idx === -1) {
      return {
        ok: false,
        code: "LINK_NOT_FOUND",
        message: "Could not remove link because the exact entry was not found.",
      };
    }
    nextLinks.splice(idx, 1);
  }

  const updated: RequirementWithSource = { ...target, links: nextLinks };
  const yaml = formatRequirementToYaml(requirementPayloadForYaml(updated));
  fs.writeFileSync(target.sourcePath, yaml, "utf-8");

  const reloaded = await loadRequirements(root, root);
  const updatedReq = reloaded.requirements.find((r) => r.id === id);
  if (!updatedReq) {
    return {
      ok: false,
      code: "RELOAD_FAILED",
      message: "Requirement update was written but could not be reloaded.",
    };
  }
  return { ok: true, requirement: updatedReq };
}

export function renderedDetailHtml(req: RequirementWithSource, all: RequirementWithSource[]): string {
  const doc = generateSingleRequirementHtml(req, all);
  return extractBodyHtml(doc);
}
