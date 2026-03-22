/**
 * GRD-SYS-007: allowed requirement file suffixes (longest first so `.req.yaml` matches before `.req.yml`).
 */
export const REQUIREMENT_FILE_EXTENSIONS = [".req.yaml", ".req.yml"] as const;

/** Default suffix for new files (bootstrap, VS Code new requirement). */
export const REQUIREMENT_FILE_EXTENSION = ".req.yml";

export function isRequirementFilename(basename: string): boolean {
  return REQUIREMENT_FILE_EXTENSIONS.some((ext) => basename.endsWith(ext));
}

/** Strip the requirement extension; returns null if the basename is not a requirement file. */
export function requirementIdFromFilename(basename: string): string | null {
  for (const ext of REQUIREMENT_FILE_EXTENSIONS) {
    if (basename.endsWith(ext)) {
      return basename.slice(0, -ext.length);
    }
  }
  return null;
}

/** For validation error messages. */
export function requirementFileExtensionsDisplay(): string {
  return REQUIREMENT_FILE_EXTENSIONS.join(" or ");
}

/** Valid basenames for a given id, for error messages. */
export function expectedRequirementBasenamesForId(id: string): string {
  return REQUIREMENT_FILE_EXTENSIONS.map((ext) => `${id}${ext}`).join(" or ");
}
