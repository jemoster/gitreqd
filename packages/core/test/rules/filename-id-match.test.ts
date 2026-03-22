import path from "node:path";
import {
  REQUIREMENT_FILE_EXTENSION,
  expectedRequirementBasenamesForId,
  requirementFileExtensionsDisplay,
} from "../../src/requirement-files";
import { filenameIdMatch } from "../../src/rules/filename-id-match";
import type { RequirementWithSource } from "../../src/types";

describe("GRD-VALID-002: Filename and id matching", () => {
  function req(id: string, sourcePath: string): RequirementWithSource {
    return {
      id,
      title: "Test",
      description: "",
      sourcePath,
    };
  }

  it("returns no errors when filename stem equals requirement id (.req.yml)", () => {
    const r = req("GRD-VALID-002", path.join("/project", "requirements", `GRD-VALID-002${REQUIREMENT_FILE_EXTENSION}`));
    expect(filenameIdMatch(r)).toEqual([]);
  });

  it("returns no errors when filename stem equals requirement id (.req.yaml)", () => {
    const r = req("GRD-VALID-002", path.join("/project", "requirements", "GRD-VALID-002.req.yaml"));
    expect(filenameIdMatch(r)).toEqual([]);
  });

  it("returns one error when id does not match filename", () => {
    const badName = `GRD-VALID-002${REQUIREMENT_FILE_EXTENSION}`;
    const r = req("GRD-VALID-001", path.join("/project", "requirements", badName));
    const errors = filenameIdMatch(r);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe(path.join("/project", "requirements", badName));
    expect(errors[0]!.message).toContain("GRD-VALID-001");
    expect(errors[0]!.message).toContain(badName);
    expect(errors[0]!.message).toContain(expectedRequirementBasenamesForId("GRD-VALID-001"));
  });

  it("returns one error when file does not use the requirement extension", () => {
    const r = req("GRD-VALID-002", path.join("/project", "requirements", "GRD-VALID-002.json"));
    const errors = filenameIdMatch(r);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe(path.join("/project", "requirements", "GRD-VALID-002.json"));
    expect(errors[0]!.message).toContain(requirementFileExtensionsDisplay());
  });

  it("returns one error when file has no requirement extension", () => {
    const r = req("GRD-VALID-002", path.join("/project", "requirements", "GRD-VALID-002"));
    const errors = filenameIdMatch(r);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain(requirementFileExtensionsDisplay());
  });
});
