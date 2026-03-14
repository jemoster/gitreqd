import {
  discoverProjectRootCandidates,
  loadRequirements,
  ROOT_MARKER,
} from "@gitreqd/core";
import type { ValidationError } from "@gitreqd/core";

export async function runValidate(projectDir: string): Promise<{ success: boolean; errors: ValidationError[] }> {
  const candidates = await discoverProjectRootCandidates(projectDir);
  if (candidates.length === 0) {
    console.error(
      `No project root found (missing ${ROOT_MARKER}). Run from a directory that contains ${ROOT_MARKER} or use --project-dir.`
    );
    return {
      success: false,
      errors: [{ path: projectDir, message: `No project root found (missing ${ROOT_MARKER})` }],
    };
  }

  const root = candidates[0]!;
  const { requirements, errors } = await loadRequirements(projectDir, root);

  for (const err of errors) {
    const location = err.line != null ? `${err.path}:${err.line}` : err.path;
    console.error(`${location}: ${err.message}`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  console.log(`Validated ${requirements.length} requirement(s).`);
  return { success: true, errors: [] };
}
