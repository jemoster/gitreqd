export const ROOT_MARKER = "shallgraph.yaml";
/** Primary markers first; `gitreqd.yaml` / `gitreqd.yml` remain as legacy aliases. */
export const ROOT_MARKER_FILENAMES = [
  "shallgraph.yaml",
  "shallgraph.yml",
  "gitreqd.yaml",
  "gitreqd.yml",
] as const;
export const ROOT_MARKER_HINT = "shallgraph.yaml or shallgraph.yml";
export const REQUIREMENT_FILE_EXTENSIONS = [".req.yaml", ".req.yml"] as const;
export const REQUIREMENT_FILE_EXTENSION = ".req.yml";
export const STANDARD_PROFILE_ID = "standard";

export function isRequirementFilename(basename: string): boolean {
  return REQUIREMENT_FILE_EXTENSIONS.some((ext) => basename.endsWith(ext));
}

export function requirementIdFromFilename(basename: string): string | null {
  for (const ext of REQUIREMENT_FILE_EXTENSIONS) {
    if (basename.endsWith(ext)) {
      return basename.slice(0, -ext.length);
    }
  }
  return null;
}

export function requirementFileExtensionsDisplay(): string {
  return REQUIREMENT_FILE_EXTENSIONS.join(" or ");
}

export function expectedRequirementBasenamesForId(id: string): string {
  return REQUIREMENT_FILE_EXTENSIONS.map((ext) => `${id}${ext}`).join(" or ");
}
