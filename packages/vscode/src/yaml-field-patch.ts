/**
 * GRD-VSC-006: Apply Markdown field edits from the preview webview back into requirement YAML.
 * Block scalars for description/rationale use `|` (clip) like the project formatter, not `|-` (strip).
 */
import { preferClipBlockChompForMarkdownKeys } from "@gitreqd/core";
import { parseDocument, Scalar } from "yaml";

export type EditableMarkdownField = "description" | "rationale";

function scalarForMarkdownField(value: string): string | Scalar {
  if (!value.includes("\n")) {
    return value;
  }
  const node = new Scalar(value);
  node.type = Scalar.BLOCK_LITERAL;
  return node;
}

export function applyYamlMarkdownFieldUpdate(
  content: string,
  field: EditableMarkdownField,
  value: string
): string {
  const doc = parseDocument(content);
  if (field === "description") {
    doc.set("description", scalarForMarkdownField(value));
  } else {
    doc.setIn(["attributes", "rationale"], scalarForMarkdownField(value));
  }
  return preferClipBlockChompForMarkdownKeys(String(doc));
}
