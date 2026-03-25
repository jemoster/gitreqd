import { applyYamlMarkdownFieldUpdate } from "../src/yaml-field-patch.js";

describe("applyYamlMarkdownFieldUpdate (GRD-VSC-006)", () => {
  it("updates description", () => {
    const src = `id: A
title: T
description: old
`;
    const out = applyYamlMarkdownFieldUpdate(src, "description", "new");
    expect(out).toContain("description: new");
  });

  it("sets attributes.rationale, creating attributes if needed", () => {
    const src = `id: A
title: T
description: d
`;
    const out = applyYamlMarkdownFieldUpdate(src, "rationale", "because");
    expect(out).toContain("rationale: because");
  });

  it("merges rationale into existing attributes", () => {
    const src = `id: A
title: T
description: d
attributes:
  status: active
`;
    const out = applyYamlMarkdownFieldUpdate(src, "rationale", "why");
    expect(out).toContain("status: active");
    expect(out).toContain("rationale: why");
  });
});
