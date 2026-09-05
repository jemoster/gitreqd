/**
 * GRD-VSC-006: Apply field edits from the preview webview back into requirement YAML.
 * Block scalars for refinement/rationale use `|` (clip) like the project formatter, not `|-` (strip).
 */
import { parseDocument, Scalar } from "yaml";

export type EditableMarkdownField = "refinement" | "rationale";

const CLIP_CHOMP_RE = /^([ \t]*(?:refinement|rationale):[ \t]*)\|-(\r?\n)/gm;

function preferClipBlockChompForMarkdownKeys(yaml: string): string {
  return yaml.replace(CLIP_CHOMP_RE, "$1|$2");
}

function scalarForMarkdownField(value: string): string | Scalar {
  if (!value.includes("\n")) {
    return value;
  }
  const node = new Scalar(value);
  node.type = Scalar.BLOCK_LITERAL;
  return node;
}

export function applyYamlRequireFieldUpdate(content: string, value: string): string {
  const doc = parseDocument(content);
  doc.set("require", value.includes("\n") ? scalarForMarkdownField(value) : value);
  return String(doc);
}

export function applyYamlMarkdownFieldUpdate(
  content: string,
  field: EditableMarkdownField,
  value: string
): string {
  const doc = parseDocument(content);
  if (field === "refinement") {
    if (value.trim()) {
      doc.set("refinement", scalarForMarkdownField(value));
    } else {
      doc.delete("refinement");
    }
  } else {
    doc.setIn(["attributes", "rationale"], scalarForMarkdownField(value));
  }
  return preferClipBlockChompForMarkdownKeys(String(doc));
}
