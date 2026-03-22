import type { RequirementProfile } from "./types.js";
import { standardProfile } from "./standard.js";

export const STANDARD_PROFILE_ID = "standard";

const profiles: Record<string, RequirementProfile> = {
  [STANDARD_PROFILE_ID]: standardProfile,
};

export function getRequirementProfile(id: string): RequirementProfile {
  const p = profiles[id];
  if (p === undefined) {
    throw new Error(`Unknown requirement profile: ${id}`);
  }
  return p;
}

export function listRegisteredProfileIds(): string[] {
  return Object.keys(profiles);
}
