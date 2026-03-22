/**
 * GRD-SYS-010: Profiles API — active profile from project marker and registry.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT_MARKER } from "../src/discovery.js";
import {
  getActiveProfileId,
  getRequirementProfile,
  listRegisteredProfileIds,
  loadActiveProfile,
  STANDARD_PROFILE_ID,
} from "../src/profile/index.js";

describe("GRD-SYS-010: profiles API", () => {
  function makeProjectRoot(): string {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-profile-"));
    const projectRoot = path.join(tmp, "proj");
    fs.mkdirSync(projectRoot);
    return projectRoot;
  }

  it("lists the standard profile", () => {
    expect(listRegisteredProfileIds()).toContain(STANDARD_PROFILE_ID);
    expect(getRequirementProfile(STANDARD_PROFILE_ID).id).toBe(STANDARD_PROFILE_ID);
  });

  it("defaults missing profile key to standard", () => {
    const projectRoot = makeProjectRoot();
    fs.writeFileSync(
      path.join(projectRoot, ROOT_MARKER),
      "requirement_dirs:\n  - requirements\n",
      "utf-8"
    );
    expect(getActiveProfileId(projectRoot)).toBe(STANDARD_PROFILE_ID);
    expect(loadActiveProfile(projectRoot).id).toBe(STANDARD_PROFILE_ID);
  });

  it("reads explicit profile: standard", () => {
    const projectRoot = makeProjectRoot();
    fs.writeFileSync(
      path.join(projectRoot, ROOT_MARKER),
      "requirement_dirs:\n  - requirements\nprofile: standard\n",
      "utf-8"
    );
    expect(getActiveProfileId(projectRoot)).toBe(STANDARD_PROFILE_ID);
  });

  it("throws when profile is unknown", () => {
    const projectRoot = makeProjectRoot();
    fs.writeFileSync(
      path.join(projectRoot, ROOT_MARKER),
      "requirement_dirs:\n  - requirements\nprofile: nonexistent-profile\n",
      "utf-8"
    );
    expect(() => getActiveProfileId(projectRoot)).toThrow(/Unknown profile/);
  });
});
