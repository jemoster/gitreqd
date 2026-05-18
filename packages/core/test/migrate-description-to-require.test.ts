import { migrateDescriptionToRequire } from "../src/migrate-description-to-require.js";

describe("migrateDescriptionToRequire", () => {
  it("moves single-line shall statement to require", () => {
    const { requirement, ambiguity } = migrateDescriptionToRequire({
      id: "A",
      title: "T",
      description:
        "The CLI shall load all requirements and validate their schema.",
    });
    expect(requirement.require).toBe(
      "The CLI shall load all requirements and validate their schema."
    );
    expect(requirement.refinement).toBe("");
    expect(ambiguity).toBeUndefined();
  });

  it("splits multi-paragraph description: first shall to require, rest to refinement", () => {
    const { requirement } = migrateDescriptionToRequire({
      id: "B",
      title: "T",
      description: `GitHub shall run npm tests when a pull request is opened or updated.

The tests shall execute in the project's CI environment and their result shall be visible on the pull request.`,
    });
    expect(requirement.require).toMatch(/GitHub shall run npm tests/);
    expect(requirement.refinement).toMatch(/tests shall execute/);
  });

  it("flags empty description", () => {
    const { ambiguity } = migrateDescriptionToRequire({
      id: "C",
      title: "T",
      description: "",
    });
    expect(ambiguity).toBe("empty_description");
  });

  it("flags description with no RFC2119 keyword", () => {
    const { ambiguity } = migrateDescriptionToRequire({
      id: "D",
      title: "T",
      description: "This is background only.",
    });
    expect(ambiguity).toBe("no_rfc2119_keyword");
  });
});
