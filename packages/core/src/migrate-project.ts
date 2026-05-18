/**
 * GRD-SYS-015 / GRD-CLI: Migrate legacy description fields to require + refinement across a project.
 */
import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import {
  discoverProjectRootCandidates,
  discoverRequirementPaths,
  ROOT_MARKER_HINT,
} from "./discovery.js";
import { formatRequirementToYaml } from "./format-requirement-yaml.js";
import {
  hasLegacyDescriptionField,
  migrateDescriptionToRequire,
  type MigrateAmbiguityReason,
} from "./migrate-description-to-require.js";
import type { ValidationError } from "./types.js";

export interface MigrateProjectFileResult {
  path: string;
  ambiguity?: MigrateAmbiguityReason;
  skipped?: boolean;
  reason?: "already_migrated" | "no_description";
}

export interface MigrateProjectResult {
  success: boolean;
  errors: ValidationError[];
  dryRun: boolean;
  files: MigrateProjectFileResult[];
  writtenPaths: string[];
}

export async function migrateProjectRequirementFiles(
  projectDir: string,
  options: { write?: boolean } = {}
): Promise<MigrateProjectResult> {
  const write = options.write === true;
  const candidates = await discoverProjectRootCandidates(projectDir);
  if (candidates.length === 0) {
    return {
      success: false,
      dryRun: !write,
      errors: [{ path: projectDir, message: `No project root found (missing ${ROOT_MARKER_HINT})` }],
      files: [],
      writtenPaths: [],
    };
  }

  const root = candidates[0]!;
  const paths = await discoverRequirementPaths(root);
  const errors: ValidationError[] = [];
  const files: MigrateProjectFileResult[] = [];
  const writtenPaths: string[] = [];
  let hasAmbiguity = false;

  for (const filePath of paths) {
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      errors.push({ path: filePath, message: String(err) });
      continue;
    }

    let obj: Record<string, unknown>;
    try {
      const parsed = parseYaml(raw);
      if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
        errors.push({ path: filePath, message: "Requirement file root must be an object" });
        continue;
      }
      obj = parsed as Record<string, unknown>;
    } catch (err) {
      errors.push({ path: filePath, message: `Invalid YAML: ${String(err)}` });
      continue;
    }

    if (!hasLegacyDescriptionField(obj)) {
      if (obj.require != null) {
        files.push({ path: filePath, skipped: true, reason: "already_migrated" });
      } else {
        files.push({ path: filePath, skipped: true, reason: "no_description" });
      }
      continue;
    }

    const id = obj.id != null ? String(obj.id) : "";
    const title = obj.title != null ? String(obj.title) : "";
    const { requirement, ambiguity } = migrateDescriptionToRequire({
      id,
      title,
      description: obj.description as string | undefined,
      attributes: obj.attributes as Record<string, unknown> | undefined,
      links: obj.links as import("./types.js").Link[] | undefined,
      satisfied_by: obj.satisfied_by as import("./types.js").Requirement["satisfied_by"],
      verified_by: obj.verified_by as import("./types.js").Requirement["verified_by"],
      parameters: obj.parameters as import("./types.js").Requirement["parameters"],
    });

    if (ambiguity) {
      hasAmbiguity = true;
    }

    files.push({ path: filePath, ambiguity });

    if (write) {
      const yaml = formatRequirementToYaml(requirement);
      fs.writeFileSync(filePath, yaml, "utf-8");
      writtenPaths.push(filePath);
    }
  }

  if (errors.length > 0) {
    return { success: false, dryRun: !write, errors, files, writtenPaths };
  }

  return {
    success: !hasAmbiguity,
    dryRun: !write,
    errors: [],
    files,
    writtenPaths,
  };
}
