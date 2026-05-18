import {
  discoverProjectRootCandidates,
  migrateProjectRequirementFiles,
  ROOT_MARKER_HINT,
} from "@gitreqd/core";
import type { MigrateAmbiguityReason } from "@gitreqd/core";

function ambiguityLabel(reason: MigrateAmbiguityReason): string {
  switch (reason) {
    case "empty_description":
      return "empty description";
    case "no_rfc2119_keyword":
      return "no shall/should/may in require";
    case "multiple_rfc2119_in_require":
      return "multiple normative keywords in require";
    default:
      return reason;
  }
}

/** GRD-SYS-015: Migrate description → require + refinement. */
export async function runMigrate(
  projectDir: string,
  options: { write?: boolean } = {}
): Promise<{ success: boolean; exitCode: number }> {
  const candidates = await discoverProjectRootCandidates(projectDir);
  if (candidates.length === 0) {
    console.error(
      `No project root found (missing ${ROOT_MARKER_HINT}). Run from a directory that contains ${ROOT_MARKER_HINT} or use --project-dir.`
    );
    return { success: false, exitCode: 1 };
  }

  const write = options.write === true;
  const { success, errors, files, writtenPaths, dryRun } = await migrateProjectRequirementFiles(
    projectDir,
    { write }
  );

  for (const err of errors) {
    const location = err.line != null ? `${err.path}:${err.line}` : err.path;
    console.error(`${location}: ${err.message}`);
  }

  if (errors.length > 0) {
    return { success: false, exitCode: 1 };
  }

  const migrated = files.filter((f) => !f.skipped);
  const skipped = files.filter((f) => f.skipped);
  const ambiguous = files.filter((f) => f.ambiguity);

  if (dryRun) {
    console.log(`Dry run: ${migrated.length} file(s) would be migrated, ${skipped.length} skipped.`);
    for (const f of migrated) {
      const flag = f.ambiguity ? ` [review: ${ambiguityLabel(f.ambiguity)}]` : "";
      console.log(`  would migrate: ${f.path}${flag}`);
    }
    for (const f of ambiguous) {
      if (!migrated.includes(f)) {
        console.log(`  review: ${f.path} (${ambiguityLabel(f.ambiguity!)})`);
      }
    }
    if (ambiguous.length > 0) {
      console.error(
        `\n${ambiguous.length} file(s) need manual review after migration. Re-run with --write after fixing, or edit require/refinement by hand.`
      );
      return { success: false, exitCode: 1 };
    }
    return { success: true, exitCode: 0 };
  }

  console.log(
    `Migrated ${writtenPaths.length} file(s), skipped ${skipped.length} (already on new schema or no description).`
  );
  if (ambiguous.length > 0) {
    console.error(`\n${ambiguous.length} migrated file(s) flagged for review:`);
    for (const f of ambiguous) {
      console.error(`  ${f.path}: ${ambiguityLabel(f.ambiguity!)}`);
    }
    return { success: false, exitCode: 1 };
  }

  return { success, exitCode: success ? 0 : 1 };
}
