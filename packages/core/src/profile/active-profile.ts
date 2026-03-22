import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { findRootMarkerPath } from "../discovery.js";
import { listRegisteredProfileIds, STANDARD_PROFILE_ID } from "./registry.js";

/**
 * GRD-SYS-010: Read optional `profile` from the project root marker; default `standard`.
 */
export function getActiveProfileId(projectRoot: string): string {
  const rootPath = findRootMarkerPath(path.resolve(projectRoot));
  if (rootPath === null) {
    return STANDARD_PROFILE_ID;
  }

  const markerLabel = path.basename(rootPath);
  let raw: string;
  try {
    raw = fs.readFileSync(rootPath, "utf-8");
  } catch {
    return STANDARD_PROFILE_ID;
  }

  let data: unknown;
  try {
    data = parseYaml(raw);
  } catch {
    return STANDARD_PROFILE_ID;
  }

  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return STANDARD_PROFILE_ID;
  }

  const obj = data as Record<string, unknown>;
  const p = obj.profile;
  if (p === undefined || p === null) {
    return STANDARD_PROFILE_ID;
  }
  if (typeof p !== "string" || !p.trim()) {
    throw new Error(
      `Invalid ${markerLabel} at ${rootPath}: "profile" must be a non-empty string when set`
    );
  }

  const id = p.trim();
  const known = new Set(listRegisteredProfileIds());
  if (!known.has(id)) {
    throw new Error(
      `Unknown profile "${id}" in ${markerLabel} at ${rootPath}. Known profiles: ${[...known].sort().join(", ")}`
    );
  }
  return id;
}
