/**
 * GRD-VSC-007: Find requirement id under the cursor (shared by hover; no vscode import for unit tests).
 */

/**
 * GRD-VSC-007: Requirement id pattern in YAML strings — hyphenated segments so single words (e.g. YAML keys like `id`) are not matched.
 */
export const REQUIREMENT_ID_REFERENCE_REGEX =
  /\b[A-Za-z0-9][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+\b/g;

/** GRD-VSC-007: Return the requirement id under the cursor on the given line, if any. */
export function findRequirementIdAtLinePosition(lineText: string, character: number): string | null {
  const re = new RegExp(REQUIREMENT_ID_REFERENCE_REGEX.source, REQUIREMENT_ID_REFERENCE_REGEX.flags);
  const matches = [...lineText.matchAll(re)];
  for (const m of matches) {
    if (m.index === undefined) continue;
    const start = m.index;
    const end = start + m[0].length;
    if (character >= start && character < end) {
      return m[0];
    }
  }
  return null;
}
