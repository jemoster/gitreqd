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

  it("uses | not |- for multiline description (clip chomp, matches formatter)", () => {
    const src = `id: A
title: T
description: old
`;
    const out = applyYamlMarkdownFieldUpdate(src, "description", "Line1\nLine2");
    expect(out).toMatch(/^description: \|(\r?\n)/m);
    expect(out).not.toContain("description: |-");
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

  it("uses | not |- for multiline rationale", () => {
    const src = `id: A
title: T
description: d
`;
    const out = applyYamlMarkdownFieldUpdate(src, "rationale", "R1\nR2");
    expect(out).toMatch(/rationale: \|(\r?\n)/);
    expect(out).not.toContain("rationale: |-");
  });
});
