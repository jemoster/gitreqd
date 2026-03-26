import {
  discoverProjectRootCandidates,
  formatProjectRequirementFiles,
  ROOT_MARKER_HINT,
} from "@gitreqd/core";
import type { ValidationError } from "@gitreqd/core";

/** GRD-CLI-006: Format all requirement YAML files under the project root. */
export async function runFormat(projectDir: string): Promise<{
  success: boolean;
  errors: ValidationError[];
  writtenCount: number;
  skippedCount: number;
}> {
  const candidates = await discoverProjectRootCandidates(projectDir);
  if (candidates.length === 0) {
    console.error(
      `No project root found (missing ${ROOT_MARKER_HINT}). Run from a directory that contains ${ROOT_MARKER_HINT} or use --project-dir.`
    );
    return {
      success: false,
      errors: [{ path: projectDir, message: `No project root found (missing ${ROOT_MARKER_HINT})` }],
      writtenCount: 0,
      skippedCount: 0,
    };
  }

  const { success, errors, writtenPaths, skippedPaths } = await formatProjectRequirementFiles(projectDir);

  for (const err of errors) {
    const location = err.line != null ? `${err.path}:${err.line}` : err.path;
    console.error(`${location}: ${err.message}`);
  }

  if (!success) {
    return { success: false, errors, writtenCount: 0, skippedCount: 0 };
  }

  console.log(
    `Formatted ${writtenPaths.length} file(s), left unchanged ${skippedPaths.length} file(s) (already canonical).`
  );
  return {
    success: true,
    errors: [],
    writtenCount: writtenPaths.length,
    skippedCount: skippedPaths.length,
  };
}
