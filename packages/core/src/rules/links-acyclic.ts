import type { RequirementWithSource, ValidationError } from "../types.js";

/**
 * Collect all requirement-id targets from a requirement's links (e.g. satisfies, refines).
 */
function getLinkTargets(requirement: RequirementWithSource): string[] {
  const targets: string[] = [];
  const links = requirement.links ?? [];
  for (const link of links) {
    if (link && typeof link === "object") {
      for (const value of Object.values(link)) {
        if (typeof value === "string") {
          targets.push(value);
        }
      }
    }
  }
  return targets;
}

/**
 * Normalize a cycle to a canonical form (sorted ids) for deduplication.
 */
function cycleKey(cycle: string[]): string {
  const sorted = [...cycle].sort();
  return sorted.join(",");
}

/**
 * GRD-VALID-005: The tool shall validate that the directed graph of links
 * between requirements contains no cycles. Cycles are reported with the path
 * of requirement ids involved.
 */
export function linksAcyclic(
  requirements: RequirementWithSource[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const idSet = new Set(requirements.map((r) => r.id));
  const idToReq = new Map(requirements.map((r) => [r.id, r]));

  const adj = new Map<string, string[]>();
  for (const r of requirements) {
    const targets = getLinkTargets(r).filter((id) => idSet.has(id));
    if (targets.length > 0) {
      adj.set(r.id, targets);
    }
  }

  const visited = new Set<string>();
  const stack: string[] = [];
  const stackSet = new Set<string>();
  const seenCycles = new Map<string, string[]>();

  function addCycle(cycle: string[]): void {
    const key = cycleKey(cycle);
    if (seenCycles.has(key)) return;
    seenCycles.set(key, cycle);
  }

  function dfs(id: string): void {
    if (stackSet.has(id)) {
      const idx = stack.indexOf(id);
      const cycle = [...stack.slice(idx), id];
      addCycle(cycle);
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    stack.push(id);
    stackSet.add(id);
    for (const target of adj.get(id) ?? []) {
      dfs(target);
    }
    stack.pop();
    stackSet.delete(id);
  }

  for (const id of idSet) {
    if (!visited.has(id)) {
      dfs(id);
    }
  }

  for (const cycle of seenCycles.values()) {
    const pathStr = cycle.join(" -> ");
    const firstReq = idToReq.get(cycle[0]!);
    const sourcePath = firstReq?.sourcePath ?? cycle[0]!;
    errors.push({
      path: sourcePath,
      message: `Cycle in requirement links: ${pathStr}`,
    });
  }

  return errors;
}
