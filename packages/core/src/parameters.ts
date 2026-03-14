/**
 * GRD-SYS-005: Requirement parameterization — template resolution.
 * GRD-SYS-006: Template syntax reflects Jinja2-style: double curly braces denote template;
 * quoted string inside {{ }} is a literal and is not processed by the template engine.
 * Syntax: {{ "literal" }} / {{ 'literal' }}, {{ :parameter_name }} (local), {{ requirement_id:parameter_name }} (cross-requirement).
 */
import type { RequirementWithSource } from "./types.js";

/** Segment of resolved text: either plain or a parameter value with source. */
export interface ResolvedSegment {
  type: "plain" | "param";
  text: string;
  /** Set when type is "param": requirement id where the parameter is defined. */
  sourceReqId?: string;
  /** Set when type is "param": parameter name. */
  paramName?: string;
}

/** GRD-SYS-006: Unescape a double-quoted literal (\\ → \, \" → "). */
function unescapeDoubleQuoted(s: string): string {
  return s.replace(/\\(.)/g, (_, c) => (c === '"' ? '"' : c === "\\" ? "\\" : "\\" + c));
}

/** GRD-SYS-006: Unescape a single-quoted literal (\\ → \, \' → '). */
function unescapeSingleQuoted(s: string): string {
  return s.replace(/\\(.)/g, (_, c) => (c === "'" ? "'" : c === "\\" ? "\\" : "\\" + c));
}

/**
 * GRD-SYS-005: Resolve template references in text to segments (plain or parameter value).
 * GRD-SYS-006: Quoted strings inside {{ }} are emitted as plain literals (not processed).
 * Unresolved parameter references are left as placeholder text so export remains unambiguous.
 */
export function resolveToSegments(
  text: string,
  currentReqId: string,
  requirementsById: Map<string, RequirementWithSource>
): ResolvedSegment[] {
  const segments: ResolvedSegment[] = [];
  let lastIndex = 0;

  // GRD-SYS-006: Match quoted literals first, then param refs. Double/single quoted content may contain \", \', \\.
  const combinedRe =
    /\{\{\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|:([A-Za-z0-9_-]+)|([A-Za-z0-9][A-Za-z0-9-]*):([A-Za-z0-9_-]+))\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = combinedRe.exec(text)) !== null) {
    const fullMatch = m[0];
    const doubleQuoted = m[1];
    const singleQuoted = m[2];
    const localParam = m[3];
    const crossReqId = m[4];
    const crossParam = m[5];

    if (lastIndex < m.index) {
      segments.push({ type: "plain", text: text.slice(lastIndex, m.index) });
    }

    if (doubleQuoted !== undefined) {
      segments.push({ type: "plain", text: unescapeDoubleQuoted(doubleQuoted) });
      lastIndex = m.index + fullMatch.length;
      continue;
    }
    if (singleQuoted !== undefined) {
      segments.push({ type: "plain", text: unescapeSingleQuoted(singleQuoted) });
      lastIndex = m.index + fullMatch.length;
      continue;
    }

    let value: string;
    let sourceReqId: string;
    let paramName: string;

    if (localParam != null) {
      sourceReqId = currentReqId;
      paramName = localParam;
      const req = requirementsById.get(currentReqId);
      const val = req?.parameters?.[paramName];
      if (val !== undefined && val !== null) {
        value = String(val);
      } else {
        value = `[param :${paramName} not found]`;
      }
    } else if (crossReqId != null && crossParam != null) {
      sourceReqId = crossReqId;
      paramName = crossParam;
      const req = requirementsById.get(crossReqId);
      const val = req?.parameters?.[paramName];
      if (val !== undefined && val !== null) {
        value = String(val);
      } else {
        value = `[param ${crossReqId}:${crossParam} not found]`;
      }
    } else {
      lastIndex = m.index + fullMatch.length;
      continue;
    }

    segments.push({ type: "param", text: value, sourceReqId, paramName });
    lastIndex = m.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "plain", text: text.slice(lastIndex) });
  }

  if (segments.length === 0 && text.length > 0) {
    segments.push({ type: "plain", text });
  }

  return segments;
}

/**
 * GRD-SYS-005: Resolve template references in text to a single string (all params substituted).
 */
export function resolveText(
  text: string,
  currentReqId: string,
  requirementsById: Map<string, RequirementWithSource>
): string {
  const segments = resolveToSegments(text, currentReqId, requirementsById);
  return segments.map((s) => s.text).join("");
}
