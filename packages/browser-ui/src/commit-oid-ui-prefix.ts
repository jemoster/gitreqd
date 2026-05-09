/**
 * GRD-UI-005: The visible commit identifier is exactly the first seven characters of the Git commit oid (short hash).
 */
export function commitOidUiPrefix(fullOid: string): string {
  const t = fullOid.trim();
  if (!t) return "";
  return t.slice(0, 7);
}
