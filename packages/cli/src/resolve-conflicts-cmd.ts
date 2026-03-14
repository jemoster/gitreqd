/**
 * GRD-GIT-002: Merge-conflict resolution for requirement files.
 * Discovers requirement files with conflict markers, resolves via LLM, validates, then writes.
 */
import fs from "node:fs";
import path from "node:path";
import {
  discoverProjectRootCandidates,
  discoverRequirementPaths,
  getOllamaConfig,
  hasConflictMarkers,
  resolveRequirementConflicts,
  ROOT_MARKER,
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
      message: `No project root found (missing ${ROOT_MARKER}). Run from a directory that contains ${ROOT_MARKER} or use --project-dir.`,
    };
    return { success: false, resolved: [], errors: [err] };
  }

  const root = candidates[0]!;
  const ollamaConfig = getOllamaConfig(root);
  if (!ollamaConfig) {
    return {
      success: false,
      resolved: [],
      errors: [{ path: path.join(root, ROOT_MARKER), message: "Missing or invalid 'ollama' config (base_url, model) in root.gitreqd" }],
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

    const result = await resolveRequirementConflicts(content, filePath, ollamaConfig);
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
