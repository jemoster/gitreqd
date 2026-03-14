import fs from "node:fs";
import path from "node:path";
import {
  discoverProjectRootCandidates,
  generateFullHtml,
  loadRequirements,
  ROOT_MARKER,
} from "@gitreqd/core";

export async function runHtml(
  projectDir: string,
  outputDir: string
): Promise<{ success: boolean; error?: string }> {
  const candidates = await discoverProjectRootCandidates(projectDir);
  if (candidates.length === 0) {
    console.error(
      `No project root found (missing ${ROOT_MARKER}). Run from a directory that contains ${ROOT_MARKER} or use --project-dir.`
    );
    return { success: false, error: `No project root found (missing ${ROOT_MARKER})` };
  }

  const root = candidates[0]!;
  const { requirements, errors } = await loadRequirements(projectDir, root);

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`${err.path}: ${err.message}`);
    }
    return {
      success: false,
      error: "Validation failed; fix errors before generating HTML.",
    };
  }

  const outDir = path.resolve(process.cwd(), outputDir);
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.join(outDir, "index.html");
  fs.writeFileSync(htmlPath, generateFullHtml(requirements), "utf-8");
  console.log(`Wrote ${htmlPath} (${requirements.length} requirements).`);
  return { success: true };
}
