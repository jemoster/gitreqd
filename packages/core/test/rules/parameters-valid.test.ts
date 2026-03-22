/**
 * GRD-SYS-005: Tests for parameter validation rule (unique names, no overlap with schema fields).
 */
import { parametersValid } from "../../src/rules/parameters-valid";
import type { RequirementWithSource } from "../../src/types";

function req(overrides: Partial<RequirementWithSource> & { id: string; sourcePath: string }): RequirementWithSource {
  const { id, sourcePath, ...rest } = overrides;
  return {
    id,
    title: "Title",
    description: "",
    sourcePath,
    ...rest,
  } as RequirementWithSource;
}

describe("GRD-SYS-005: parametersValid", () => {
  it("returns no errors when requirement has no parameters", () => {
    expect(parametersValid(req({ id: "R", sourcePath: "/r.req.yml" }))).toEqual([]);
  });

  it("returns no errors when parameters are valid and unique", () => {
    const r = req({
      id: "R",
      sourcePath: "/r.req.yml",
      parameters: { limit: 10, name: "foo", enabled: true },
    });
    expect(parametersValid(r)).toEqual([]);
  });

  it("returns error when parameter name overlaps with id", () => {
    const r = req({
      id: "R",
      sourcePath: "/r.req.yml",
      parameters: { id: "value" },
    });
    const errors = parametersValid(r);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain("GRD-SYS-005");
    expect(errors[0]!.message).toContain("id");
    expect(errors[0]!.message).toContain("overlap");
  });

  it("returns error when parameter name overlaps with title", () => {
    const r = req({
      id: "R",
      sourcePath: "/r.req.yml",
      parameters: { title: "x" },
    });
    const errors = parametersValid(r);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain("title");
  });

  it("returns error when parameter name overlaps with description", () => {
    const r = req({
      id: "R",
      sourcePath: "/r.req.yml",
      parameters: { description: "x" },
    });
    const errors = parametersValid(r);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain("description");
  });
});
