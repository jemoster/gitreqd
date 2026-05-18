import { applyYamlMarkdownFieldUpdate, applyYamlRequireFieldUpdate } from "../src/yaml-field-patch";

describe("yaml-field-patch", () => {
  it("updates require", () => {
    const src = `id: X
title: T
require: old
`;
    const out = applyYamlRequireFieldUpdate(src, "The system shall do new.");
    expect(out).toContain("require: The system shall do new.");
  });

  it("updates refinement", () => {
    const src = `id: X
title: T
require: The system shall .
refinement: old
`;
    const out = applyYamlMarkdownFieldUpdate(src, "refinement", "new");
    expect(out).toContain("refinement: new");
  });

  it("uses | not |- for multiline refinement (clip chomp, matches formatter)", () => {
    const src = `id: X
title: T
require: The system shall .
refinement: old
`;
    const out = applyYamlMarkdownFieldUpdate(src, "refinement", "Line1\nLine2");
    expect(out).toMatch(/^refinement: \|(\r?\n)/m);
    expect(out).not.toContain("refinement: |-");
  });

  it("updates rationale under attributes", () => {
    const src = `id: X
title: T
require: The system shall .
refinement: d
attributes:
  rationale: old
`;
    const out = applyYamlMarkdownFieldUpdate(src, "rationale", "new rationale");
    expect(out).toContain("rationale:");
    expect(out).toContain("new rationale");
  });

  it("removes empty refinement key", () => {
    const src = `id: X
title: T
require: The system shall .
refinement: |
  old
`;
    const out = applyYamlMarkdownFieldUpdate(src, "refinement", "");
    expect(out).not.toMatch(/^refinement:/m);
  });
});
