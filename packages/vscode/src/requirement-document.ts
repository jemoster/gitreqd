import * as path from "node:path";
import type { TextDocument } from "vscode";
import { isRequirementFilename } from "@gitreqd/core";

/** True when the file is a gitreqd requirement file (GRD-SYS-007: `.req.yml` suffix). */
export function isRequirementDocument(document: TextDocument): boolean {
  return isRequirementFilename(path.basename(document.uri.fsPath));
}
