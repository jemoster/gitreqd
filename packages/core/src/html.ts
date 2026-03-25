import MarkdownIt from "markdown-it";
import { resolveToSegments } from "./parameters.js";
import type { RequirementWithSource } from "./types.js";

/** GRD-SYS-005: Placeholder character range for param spans (U+E000–E0FF); replaced after markdown. */
const PARAM_PLACEHOLDER_BASE = 0xe000;

/** GRD-HTML-004: Markdown renderer for description and rationale (html disabled for safety). */
const md = new MarkdownIt({ html: false });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** GRD-HTML-003: Tree node for hierarchical index by category. */
interface IndexNode {
  requirements: RequirementWithSource[];
  children: Map<string, IndexNode>;
}

function buildIndexTree(requirements: RequirementWithSource[]): IndexNode {
  const root: IndexNode = { requirements: [], children: new Map() };
  for (const r of requirements) {
    const path = r.categoryPath ?? [];
    let node = root;
    for (const segment of path) {
      let child = node.children.get(segment);
      if (!child) {
        child = { requirements: [], children: new Map() };
        node.children.set(segment, child);
      }
      node = child;
    }
    node.requirements.push(r);
  }
  return root;
}

function renderIndexNode(
  node: IndexNode,
  depth: number,
  requirementsById: Map<string, RequirementWithSource>
): string {
  const parts: string[] = [];
  for (const [segment, child] of [...node.children.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const hasReqs = child.requirements.length > 0;
    const hasChildren = child.children.size > 0;
    parts.push(`<li><span class="index-category">${escapeHtml(segment)}</span>`);
    if (hasReqs || hasChildren) {
      parts.push("<ul>");
      for (const r of child.requirements) {
        const titleHtml = resolveAndRenderText(r.title, r.id, requirementsById, false);
        parts.push(
          `  <li><a href="#${escapeHtml(r.id)}">${escapeHtml(r.id)}</a> – ${titleHtml}</li>`
        );
      }
      parts.push(renderIndexNode(child, depth + 1, requirementsById));
      parts.push("</ul>");
    }
    parts.push("</li>");
  }
  return parts.join("\n");
}

/** GRD-HTML-003: Top-level index of requirements grouped by category. GRD-SYS-005: Titles resolved for params. */
function renderHierarchicalIndex(
  requirements: RequirementWithSource[],
  requirementsById: Map<string, RequirementWithSource>
): string {
  const root = buildIndexTree(requirements);
  const parts: string[] = [];
  for (const r of root.requirements) {
    const titleHtml = resolveAndRenderText(r.title, r.id, requirementsById, false);
    parts.push(
      `    <li><a href="#${escapeHtml(r.id)}">${escapeHtml(r.id)}</a> – ${titleHtml}</li>`
    );
  }
  const rootList = parts.length > 0 ? `\n  <ul>\n${parts.join("\n")}\n  </ul>\n` : "";
  const childList = root.children.size > 0
    ? `\n  <ul class="index-by-category">\n${renderIndexNode(root, 0, requirementsById)}\n  </ul>\n`
    : "";
  return rootList + childList;
}

/** Format a single attribute value for HTML (string or multiline). */
function formatAttrValue(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return escapeHtml(s).replace(/\n/g, "<br>");
}

/** GRD-HTML-004: Render markdown to HTML for description and rationale. */
function markdownToHtml(text: string): string {
  return md.render(text.trim()).trim();
}

/**
 * GRD-SYS-005: Resolve parameter references in text and render to HTML. Parameterized values
 * are wrapped in spans with class "param-value" and link to source requirement for traceability.
 * If markdown is true, runs markdown on the resolved text (for description/rationale).
 */
function resolveAndRenderText(
  text: string,
  currentReqId: string,
  requirementsById: Map<string, RequirementWithSource>,
  useMarkdown: boolean
): string {
  const segments = resolveToSegments(text, currentReqId, requirementsById);
  const paramSpans: string[] = [];
  let resolved = "";
  for (const seg of segments) {
    if (seg.type === "plain") {
      resolved += seg.text;
    } else {
      const idx = paramSpans.length;
      const placeholder = String.fromCharCode(PARAM_PLACEHOLDER_BASE + idx);
      resolved += placeholder;
      const link = seg.sourceReqId
        ? `<a href="#${escapeHtml(seg.sourceReqId)}" title="Parameter ${escapeHtml(seg.paramName ?? "")} from ${escapeHtml(seg.sourceReqId)}">${escapeHtml(seg.text)}</a>`
        : escapeHtml(seg.text);
      paramSpans.push(
        `<span class="param-value" data-source-req="${escapeHtml(seg.sourceReqId ?? "")}" data-param="${escapeHtml(seg.paramName ?? "")}">${link}</span>`
      );
    }
  }
  let out = useMarkdown ? markdownToHtml(resolved) : escapeHtml(resolved).replace(/\n/g, "<br>");
  for (let i = 0; i < paramSpans.length; i++) {
    out = out.split(String.fromCharCode(PARAM_PLACEHOLDER_BASE + i)).join(paramSpans[i]!);
  }
  return out;
}

/** Attributes shown in meta line (short); rationale is rendered below description. */
const META_ATTR_KEYS = new Set(["status"]);

/** GRD-HTML-002: Collect requirement ids that link to each requirement (reverse lookup). */
function linkedFromMap(requirements: RequirementWithSource[]): Map<string, string[]> {
  const idSet = new Set(requirements.map((r) => r.id));
  const map = new Map<string, string[]>();
  for (const r of requirements) {
    const links = r.links ?? [];
    for (const link of links) {
      if (link && typeof link === "object") {
        for (const value of Object.values(link)) {
          if (typeof value === "string" && value !== r.id && idSet.has(value)) {
            const list = map.get(value) ?? [];
            if (!list.includes(r.id)) list.push(r.id);
            map.set(value, list);
          }
        }
      }
    }
  }
  return map;
}

/** GRD-HTML-001: HTML report represents the full set of information in the requirements file.
 *  GRD-VSC-006: Optional `editableFieldMarkers` adds data-gitreqd-field for the preview webview WYSIWYG. */
function requirementDetailHtml(
  r: RequirementWithSource,
  linkedFromIds?: string[],
  requirementsById?: Map<string, RequirementWithSource>,
  editableFieldMarkers?: boolean
): string {
  const byId = requirementsById ?? new Map<string, RequirementWithSource>([[r.id, r]]);
  const resolve = (text: string, useMarkdown: boolean) =>
    resolveAndRenderText(text, r.id, byId, useMarkdown);

  const attrs = r.attributes && typeof r.attributes === "object" ? r.attributes : {};
  const attrEntries = Object.entries(attrs).filter(
    ([_, v]) => v != null && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
  );
  const metaAttrParts = attrEntries
    .filter(([k]) => META_ATTR_KEYS.has(k))
    .map(
      ([k, v]) =>
        `<span class="attr"><span class="label">${escapeHtml(capitalizeLabel(k))}</span> ${formatAttrValue(v)}</span>`
    );
  const belowDescAttrs = attrEntries.filter(([k]) => !META_ATTR_KEYS.has(k));

  const satisfiesIds: string[] = [];
  const otherLinkParts: string[] = [];
  for (const link of r.links ?? []) {
    if (link && typeof link === "object") {
      if (link.satisfies != null) {
        const valStr = String(link.satisfies).trim();
        if (valStr) satisfiesIds.push(valStr);
      }
      for (const [key, val] of Object.entries(link)) {
        if (val == null || key === "key" || key === "satisfies") continue;
        const valStr = String(val).trim();
        if (!valStr) continue;
        const isRef = /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(valStr);
        const linkVal = isRef
          ? `<a href="#${escapeHtml(valStr)}">${escapeHtml(valStr)}</a>`
          : escapeHtml(valStr);
        otherLinkParts.push(`<span class="link"><span class="label">${escapeHtml(capitalizeLabel(key))}</span> ${linkVal}</span>`);
      }
    }
  }

  const metaHtml =
    `<p class="meta">${metaAttrParts.length > 0 ? metaAttrParts.join(" | ") : "—"}</p>`;

  /** GRD-HTML-001: When a requirement defines parameters, display name and value. GRD-HTML-005: Render parameters in a table for clear alignment and scannability. */
  const parametersHtml =
    r.parameters && Object.keys(r.parameters).length > 0
      ? `<div class="labeled-block parameters-block"><span class="label">Parameters</span><table class="parameters-table"><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>${Object.entries(r.parameters)
          .map(
            ([name, value]) =>
              `<tr><td>${escapeHtml(name)}</td><td>${formatAttrValue(value)}</td></tr>`
          )
          .join("")}</tbody></table></div>`
      : "";

  const satisfiesHtml =
    satisfiesIds.length > 0
      ? `<div class="labeled-block"><span class="label">Satisfies</span><ul class="satisfies-list">${satisfiesIds.map((id) => `<li><a href="#${escapeHtml(id)}">${escapeHtml(id)}</a></li>`).join("")}</ul></div>`
      : "";

  /** GRD-HTML-002: List of requirements that link to this requirement. */
  const linkedFromHtml =
    linkedFromIds && linkedFromIds.length > 0
      ? `<div class="labeled-block"><span class="label">Linked from</span><ul class="linked-from-list">${linkedFromIds.map((id) => `<li><a href="#${escapeHtml(id)}">${escapeHtml(id)}</a></li>`).join("")}</ul></div>`
      : "";

  const otherLinksHtml =
    otherLinkParts.length > 0
      ? `<div class="labeled-block links-block"><span class="label">Links</span><p class="link-inline">${otherLinkParts.join(" | ")}</p></div>`
      : "";

  /** GRD-HTML-004: Rationale and other below-desc attributes rendered as Markdown. GRD-SYS-005: Params resolved and styled. */
  const rationaleHtml =
    belowDescAttrs.length > 0
      ? belowDescAttrs
          .map(([k, v]) => {
            const strVal = String(v);
            const html = k === "rationale" ? resolve(strVal, true) : resolve(strVal, false);
            const rationaleMarker =
              editableFieldMarkers && k === "rationale" ? ' data-gitreqd-field="rationale"' : "";
            return `<div class="labeled-block"><span class="label">${escapeHtml(capitalizeLabel(k))}</span><div class="rationale"${rationaleMarker}>${html}</div></div>`;
          })
          .join("")
      : "";

  const linksAtBottom =
    [satisfiesHtml, linkedFromHtml, otherLinksHtml].filter(Boolean).join("\n      ");

  /** GRD-SYS-005: Title and description with parameter references resolved; parameterized values visually distinct and linked to source. */
  const titleHtml = resolve(r.title, false);
  const descriptionHtml = resolve(r.description, true);

  return `
    <section id="${escapeHtml(r.id)}" class="requirement-detail">
      <h2>${escapeHtml(r.id)} – ${titleHtml}</h2>
      ${metaHtml}
      ${parametersHtml}
      <div class="labeled-block"><span class="label">Description</span><div class="description"${
        editableFieldMarkers ? ' data-gitreqd-field="description"' : ""
      }>${descriptionHtml}</div></div>
      ${rationaleHtml}
      ${linksAtBottom}
      <p class="source"><span class="label">Source file</span> ${escapeHtml(r.sourcePath)}</p>
    </section>`;
}

function capitalizeLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
}

/** GRD-HTML-001: HTML report represents the full set of information in the requirements file. GRD-SYS-010: Invoked via the active profile. */
export function generateFullHtml(requirements: RequirementWithSource[]): string {
  /** GRD-SYS-005: Map for resolving cross-requirement parameter references. */
  const requirementsById = new Map(requirements.map((r) => [r.id, r]));
  /** GRD-HTML-003: Top-level index of requirements, hierarchical list grouped by category. */
  const indexHtml = renderHierarchicalIndex(requirements, requirementsById);
  /** GRD-HTML-002: Reverse lookup so each requirement shows who links to it. */
  const linkedFrom = linkedFromMap(requirements);
  const details = requirements
    .map((r) => requirementDetailHtml(r, linkedFrom.get(r.id), requirementsById, false))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Requirements report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 60rem; margin: 0 auto; padding: 1rem; }
    h1 { margin-top: 0; }
    .requirement-detail { margin: 2rem 0; padding-bottom: 2rem; border-bottom: 1px solid #eee; }
    .meta, .source { color: #666; font-size: 0.9rem; }
    .label { font-weight: 600; color: #444; }
    .labeled-block { margin-top: 0.75rem; }
    .labeled-block .label { display: block; margin-bottom: 0.25rem; font-size: 0.9rem; }
    .description p, .rationale p { margin: 0.4em 0; }
    .description p:first-child, .rationale p:first-child { margin-top: 0; }
    .description p:last-child, .rationale p:last-child { margin-bottom: 0; }
    .rationale { margin-top: 0; }
    .satisfies-list, .linked-from-list { margin: 0.25rem 0 0 1.25rem; padding: 0; }
    .index-category { font-weight: 600; color: #333; }
    .param-value { background: #e8f4f8; padding: 0.1em 0.3em; border-radius: 3px; font-weight: 500; }
    .parameters-table { margin: 0.25rem 0 0 0; border-collapse: collapse; width: 100%; max-width: 30rem; }
    .parameters-table th, .parameters-table td { padding: 0.25rem 0.5rem; text-align: left; border: 1px solid #ddd; }
    .parameters-table th { font-weight: 600; color: #444; background: #f8f8f8; }
  </style>
</head>
<body>
  <h1>Requirements</h1>
  <p>Total: ${requirements.length}</p>
  <h2>Index</h2>
${indexHtml}
  <h2>Details</h2>
${details}
</body>
</html>`;
}

/** GRD-VSC-003: Single-requirement preview shares base structure/styling with full report.
 *  GRD-HTML-004: Description and rationale are rendered as Markdown (same as full report).
 *  GRD-VSC-006: Pass `editableFieldMarkers: true` in the VSCode preview so the webview can attach WYSIWYG editors. */
export function generateSingleRequirementHtml(
  requirement: RequirementWithSource,
  allRequirements?: RequirementWithSource[],
  options?: { editableFieldMarkers?: boolean }
): string {
  // Use the same head, styling, and detail rendering as the full report (including markdown).
  // Only the scope differs: single requirement, no index/list.
  const list = allRequirements && allRequirements.length > 0 ? allRequirements : [requirement];
  const requirementsById = new Map(list.map((r) => [r.id, r]));
  const linkedFromIds = linkedFromMap(list).get(requirement.id);
  const detail = requirementDetailHtml(
    requirement,
    linkedFromIds,
    requirementsById,
    options?.editableFieldMarkers === true
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Requirement ${escapeHtml(requirement.id)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 60rem; margin: 0 auto; padding: 1rem; }
    .requirement-detail { margin: 0; padding: 0; border: none; }
    .meta, .source { color: #666; font-size: 0.9rem; }
    .label { font-weight: 600; color: #444; }
    .labeled-block { margin-top: 0.75rem; }
    .labeled-block .label { display: block; margin-bottom: 0.25rem; font-size: 0.9rem; }
    .description p, .rationale p { margin: 0.4em 0; }
    .description p:first-child, .rationale p:first-child { margin-top: 0; }
    .description p:last-child, .rationale p:last-child { margin-bottom: 0; }
    .rationale { margin-top: 0; }
    .satisfies-list, .linked-from-list { margin: 0.25rem 0 0 1.25rem; padding: 0; }
    .param-value { background: #e8f4f8; padding: 0.1em 0.3em; border-radius: 3px; font-weight: 500; }
    .parameters-table { margin: 0.25rem 0 0 0; border-collapse: collapse; width: 100%; max-width: 30rem; }
    .parameters-table th, .parameters-table td { padding: 0.25rem 0.5rem; text-align: left; border: 1px solid #ddd; }
    .parameters-table th { font-weight: 600; color: #444; background: #f8f8f8; }
  </style>
</head>
<body>
${detail}
</body>
</html>`;
}

