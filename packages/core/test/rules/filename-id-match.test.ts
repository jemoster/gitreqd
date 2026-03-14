import path from "node:path";
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

  it("returns no errors when filename (without extension) equals requirement id (.yml)", () => {
    const r = req("GRD-VALID-002", path.join("/project", "requirements", "GRD-VALID-002.yml"));
    expect(filenameIdMatch(r)).toEqual([]);
  });

  it("returns no errors when filename (without extension) equals requirement id (.yaml)", () => {
    const r = req("GRD-VALID-001", path.join("/project", "requirements", "GRD-VALID-001.yaml"));
    expect(filenameIdMatch(r)).toEqual([]);
  });

  it("returns one error when id does not match filename", () => {
    const r = req("GRD-VALID-001", path.join("/project", "requirements", "GRD-VALID-002.yml"));
    const errors = filenameIdMatch(r);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe(path.join("/project", "requirements", "GRD-VALID-002.yml"));
    expect(errors[0]!.message).toContain("GRD-VALID-001");
    expect(errors[0]!.message).toContain("GRD-VALID-002.yml");
    expect(errors[0]!.message).toContain("expected GRD-VALID-001.yml");
  });

  it("returns one error when file has non-.yml/.yaml extension", () => {
    const r = req("GRD-VALID-002", path.join("/project", "requirements", "GRD-VALID-002.json"));
    const errors = filenameIdMatch(r);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe(path.join("/project", "requirements", "GRD-VALID-002.json"));
    expect(errors[0]!.message).toMatch(/\.yml or \.yaml/);
  });

  it("returns one error when file has no extension", () => {
    const r = req("GRD-VALID-002", path.join("/project", "requirements", "GRD-VALID-002"));
    const errors = filenameIdMatch(r);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toMatch(/\.yml or \.yaml/);
  });
});
