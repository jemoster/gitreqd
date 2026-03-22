import { getActiveProfileId } from "./active-profile.js";
import { getRequirementProfile } from "./registry.js";
import type { RequirementProfile } from "./types.js";

export type { RequirementProfile } from "./types.js";
export { getActiveProfileId } from "./active-profile.js";
export { getRequirementProfile, listRegisteredProfileIds, STANDARD_PROFILE_ID } from "./registry.js";

/**
 * GRD-SYS-010: Resolve the active profile from project configuration and return its implementation.
 */
export function loadActiveProfile(projectRoot: string): RequirementProfile {
  return getRequirementProfile(getActiveProfileId(projectRoot));
}
