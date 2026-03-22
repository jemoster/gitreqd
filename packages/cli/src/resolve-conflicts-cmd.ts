/**
 * GRD-GIT-002: Merge-conflict resolution for requirement files.
 * Discovers requirement files with conflict markers, resolves via LLM, validates, then writes.
 */
import fs from "node:fs";
import path from "node:path";
import {
  discoverProjectRootCandidates,
  discoverRequirementPaths,
  findRootMarkerPath,
  getOllamaConfig,
  hasConflictMarkers,
  loadActiveProfile,
  resolveRequirementConflicts,
  ROOT_MARKER,
  ROOT_MARKER_HINT,
} from "@gitreqd/core";
import type { ValidationError } from "@gitreqd/core";

export async function runResolveConflicts(projectDir: string): Promise<{
  success: boolean;
  resolved: string[];
  errors: ValidationError[];
}> {
  const candidates = await discoverProjectRootCandidates(projectDir);
  if (candidates.length === 0) {
    const err: ValidationError = {
      path: projectDir,
      message: `No project root found (missing ${ROOT_MARKER_HINT}). Run from a directory that contains ${ROOT_MARKER_HINT} or use --project-dir.`,
    };
    return { success: false, resolved: [], errors: [err] };
  }

  const root = candidates[0]!;
  const profile = loadActiveProfile(root);
  const ollamaConfig = getOllamaConfig(root);
  if (!ollamaConfig) {
    return {
      success: false,
      resolved: [],
      errors: [{
        path: findRootMarkerPath(root) ?? path.join(root, ROOT_MARKER),
        message: `Missing or invalid 'ollama' config (base_url, model) in ${ROOT_MARKER_HINT}`,
      }],
    };
  }

  const requirementPaths = await discoverRequirementPaths(root);
  const errors: ValidationError[] = [];
  const resolved: string[] = [];

  for (const filePath of requirementPaths) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      errors.push({ path: filePath, message: String(err) });
      continue;
    }
    if (!hasConflictMarkers(content)) continue;

    const result = await resolveRequirementConflicts(content, filePath, ollamaConfig, { profile });
    if ("error" in result) {
      errors.push(result.error);
      continue;
    }

    try {
      fs.writeFileSync(filePath, result.resolved, "utf-8");
      resolved.push(filePath);
    } catch (err) {
      errors.push({ path: filePath, message: `Failed to write resolved content: ${err}` });
    }
  }

  return {
    success: errors.length === 0,
    resolved,
    errors,
  };
}
