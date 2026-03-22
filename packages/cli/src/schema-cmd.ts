import fs from "node:fs";
import { stringify } from "yaml";
import {
  discoverProjectRootCandidates,
  loadActiveProfile,
  ROOT_MARKER_HINT,
} from "@gitreqd/core";

/** GRD-CLI-005: Supported schema output formats (extensible). */
export type SchemaOutputFormat = "json-schema" | "yaml";

/**
 * GRD-CLI-005: Write the effective requirement schema for the project to stdout or a file.
 */
export async function runSchema(
  projectDir: string,
  options: { format: SchemaOutputFormat; outputFile?: string }
): Promise<{ success: boolean; error?: string }> {
  const candidates = await discoverProjectRootCandidates(projectDir);
  if (candidates.length === 0) {
    const msg = `No project root found (missing ${ROOT_MARKER_HINT}). Run from a directory that contains ${ROOT_MARKER_HINT} or use --project-dir.`;
    return { success: false, error: msg };
  }

  const root = candidates[0]!;
  const profile = loadActiveProfile(root);
  const compose = profile.requirementSchemaComposeOptionsForProject(root);
  const schema = profile.exportRequirementFileJsonSchema(compose);

  let body: string;
  if (options.format === "json-schema") {
    body = `${JSON.stringify(schema, null, 2)}\n`;
  } else {
    body = `${stringify(schema)}\n`;
  }

  if (options.outputFile !== undefined && options.outputFile.length > 0) {
    fs.writeFileSync(options.outputFile, body, "utf-8");
  } else {
    process.stdout.write(body);
  }

  return { success: true };
}
