/**
 * GRD-CLI-004: CLI bootstrap project – initialize a directory with gitreqd.yaml and requirements folder.
 */
import fs from "node:fs";
import path from "node:path";
import { findRootMarkerPath, ROOT_MARKER } from "@gitreqd/core";

const DEFAULT_REQUIREMENT_DIR = "requirements";
const MINIMAL_ROOT_CONTENT = `requirement_dirs:
  - ${DEFAULT_REQUIREMENT_DIR}
`;

export interface BootstrapOptions {
  /** When true, overwrite existing gitreqd.yaml and do not fail if requirements dir exists. */
  force?: boolean;
  /** When true, copy .cursor rules into target/.cursor/rules. */
  cursorRules?: boolean;
  /** Path to .cursor/rules template directory (used when cursorRules is true). Omit to skip copying rules. */
  templateRulesDir?: string | null;
}

export interface BootstrapResult {
  success: boolean;
  /** Paths created or updated (for messaging). */
  created: string[];
  error?: string;
}

/**
 * GRD-CLI-004: Bootstrap a directory with gitreqd.yaml and a requirements folder.
 * Optionally add .cursor rules. With force, overwrites gitreqd.yaml and skips creating requirements if it exists.
 */
export async function runBootstrap(
  targetDir: string,
  options: BootstrapOptions = {}
): Promise<BootstrapResult> {
  const { force = false, cursorRules = false, templateRulesDir = null } = options;
  const resolvedDir = path.resolve(targetDir);
  const created: string[] = [];

  if (!fs.existsSync(resolvedDir)) {
    return {
      success: false,
      created: [],
      error: `Target directory does not exist: ${resolvedDir}`,
    };
  }

  const stat = fs.statSync(resolvedDir);
  if (!stat.isDirectory()) {
    return {
      success: false,
      created: [],
      error: `Not a directory: ${resolvedDir}`,
    };
  }

  const existingMarker = findRootMarkerPath(resolvedDir);
  const rootMarkerPath = path.join(resolvedDir, ROOT_MARKER);
  const requirementsPath = path.join(resolvedDir, DEFAULT_REQUIREMENT_DIR);

  if (existingMarker !== null && !force) {
    return {
      success: false,
      created: [],
      error: `Project root file already exists: ${existingMarker}. Use --force to overwrite.`,
    };
  }

  if (fs.existsSync(requirementsPath) && !fs.statSync(requirementsPath).isDirectory()) {
    return {
      success: false,
      created: [],
      error: `Path exists and is not a directory: ${requirementsPath}.`,
    };
  }

  try {
    fs.writeFileSync(rootMarkerPath, MINIMAL_ROOT_CONTENT, "utf-8");
    created.push(rootMarkerPath);
  } catch (err) {
    return {
      success: false,
      created,
      error: `Failed to write ${ROOT_MARKER}: ${String(err)}`,
    };
  }

  if (!fs.existsSync(requirementsPath)) {
    fs.mkdirSync(requirementsPath, { recursive: true });
    created.push(requirementsPath);
  }

  if (cursorRules && templateRulesDir && fs.existsSync(templateRulesDir)) {
    const cursorRulesDest = path.join(resolvedDir, ".cursor", "rules");
    fs.mkdirSync(cursorRulesDest, { recursive: true });
    const entries = fs.readdirSync(templateRulesDir, { withFileTypes: true });
    for (const ent of entries) {
      const src = path.join(templateRulesDir, ent.name);
      const dest = path.join(cursorRulesDest, ent.name);
      if (ent.isFile()) {
        fs.copyFileSync(src, dest);
        created.push(dest);
      }
    }
  }

  return { success: true, created };
}
