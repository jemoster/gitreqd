/**
 * GRD-VSC-006: Apply Markdown field edits from the preview webview back into requirement YAML.
 */
import { parseDocument } from "yaml";

export type EditableMarkdownField = "description" | "rationale";

export function applyYamlMarkdownFieldUpdate(
  content: string,
  field: EditableMarkdownField,
  value: string
): string {
  const doc = parseDocument(content);
  if (field === "description") {
    doc.set("description", value);
  } else {
    doc.setIn(["attributes", "rationale"], value);
  }
  return String(doc);
}
