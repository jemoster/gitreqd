import { requireValid } from "../src/rules/require-valid.js";
import type { RequirementWithSource } from "../src/types.js";

function req(requireText: string): RequirementWithSource {
  return {
    id: "X-001",
    title: "T",
    require: requireText,
    refinement: "",
    sourcePath: "/p/X-001.req.yml",
  };
}

describe("requireValid", () => {
  it("accepts a single shall statement", () => {
    expect(requireValid(req("The system shall do X."))).toEqual([]);
  });

  it("rejects empty require", () => {
    const errors = requireValid(req(""));
    expect(errors.length).toBe(1);
    expect(errors[0]!.message).toMatch(/require/);
  });

  it("rejects require without RFC2119 keyword", () => {
    const errors = requireValid(req("The system must do X."));
    expect(errors.length).toBe(1);
    expect(errors[0]!.message).toMatch(/shall, should, or may/);
  });

  it("rejects require with multiple RFC2119 keywords", () => {
    const errors = requireValid(
      req("The system shall do X and may do Y.")
    );
    expect(errors.length).toBe(1);
    expect(errors[0]!.message).toMatch(/single statement/);
  });
});
