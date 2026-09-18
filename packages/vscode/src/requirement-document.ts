import * as path from "node:path";
import type { TextDocument } from "vscode";
import { isRequirementFilename } from "@shallgraph/core";

/** True when the file is a shallgraph requirement file (GRD-SYS-007: `.req.yml` suffix). */
export function isRequirementDocument(document: TextDocument): boolean {
  return isRequirementFilename(path.basename(document.uri.fsPath));
}
