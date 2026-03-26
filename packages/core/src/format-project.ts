/**
 * GRD-CLI-006: Format every discovered requirement YAML file in a project using the active
 * profile parser and GRD-SYS-011 canonical serialization.
 */
import fs from "node:fs";
import {
  discoverProjectRootCandidates,
  discoverRequirementPaths,
  ROOT_MARKER_HINT,
} from "./discovery.js";
import { formatRequirementToYaml, normalizeRequirementFileTextForCompare } from "./format-requirement-yaml.js";
import { loadActiveProfile } from "./profile/index.js";
import type { Requirement, ValidationError } from "./types.js";
import type { RequirementWithSource } from "./types.js";

function requirementPayloadForYaml(r: RequirementWithSource): Requirement {
  const payload: Requirement = {
    id: r.id,
    title: r.title,
    description: r.description,
  };
  if (r.attributes !== undefined) {
    payload.attributes = r.attributes;
  }
  if (r.links !== undefined) {
    payload.links = r.links;
  }
  if (r.parameters !== undefined) {
    payload.parameters = r.parameters;
  }
  return payload;
}

export interface FormatProjectResult {
  success: boolean;
  errors: ValidationError[];
  writtenPaths: string[];
  skippedPaths: string[];
}

export async function formatProjectRequirementFiles(projectDir: string): Promise<FormatProjectResult> {
  const candidates = await discoverProjectRootCandidates(projectDir);
  if (candidates.length === 0) {
    return {
      success: false,
      errors: [{ path: projectDir, message: `No project root found (missing ${ROOT_MARKER_HINT})` }],
      writtenPaths: [],
      skippedPaths: [],
    };
  }

  const root = candidates[0]!;
  const paths = await discoverRequirementPaths(root);
  const profile = loadActiveProfile(root);
  const errors: ValidationError[] = [];
  const parsed: { path: string; raw: string; requirement: RequirementWithSource }[] = [];

  for (const filePath of paths) {
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      errors.push({ path: filePath, message: String(err) });
      continue;
    }
    const result = profile.parseRequirementFile(filePath);
    if ("error" in result) {
      errors.push(result.error);
      continue;
    }
    parsed.push({ path: filePath, raw, requirement: result.requirement });
  }

  if (errors.length > 0) {
    return { success: false, errors, writtenPaths: [], skippedPaths: [] };
  }

  const writtenPaths: string[] = [];
  const skippedPaths: string[] = [];

  for (const { path: filePath, raw, requirement } of parsed) {
    const yaml = formatRequirementToYaml(requirementPayloadForYaml(requirement));
    const normRaw = normalizeRequirementFileTextForCompare(raw);
    const normYaml = normalizeRequirementFileTextForCompare(yaml);
    if (normRaw === normYaml) {
      skippedPaths.push(filePath);
    } else {
      fs.writeFileSync(filePath, yaml, "utf-8");
      writtenPaths.push(filePath);
    }
  }

  return { success: true, errors: [], writtenPaths, skippedPaths };
}
