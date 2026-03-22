import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { findRootMarkerPath } from "./discovery.js";
import type { RequirementSchemaComposeOptions } from "./requirement-schema.js";

/**
 * GRD-CLI-005 / GRD-SYS-009: Build compose options for the requirement JSON Schema from the
 * project root marker, when configuration affects the exported schema.
 */
export function requirementSchemaComposeOptionsForProject(
  projectRoot: string
): RequirementSchemaComposeOptions | undefined {
  const marker = findRootMarkerPath(path.resolve(projectRoot));
  if (marker == null) {
    return undefined;
  }
  let raw: string;
  try {
    raw = fs.readFileSync(marker, "utf-8");
  } catch {
    return undefined;
  }
  let data: unknown;
  try {
    data = parseYaml(raw);
  } catch {
    return undefined;
  }
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return undefined;
  }
  void (data as Record<string, unknown>);
  // Future: map gitreqd.yaml fields into RequirementSchemaComposeOptions when schema composition uses them.
  return undefined;
}
