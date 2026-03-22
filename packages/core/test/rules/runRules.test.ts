import path from "node:path";
import {
  defaultRules,
  defaultGlobalRules,
  runRules,
  runGlobalRules,
} from "../../src/rules/index";
import type { RequirementWithSource } from "../../src/types";

describe("Validation rulesets (GRD-VALID-001)", () => {
  function req(id: string, sourcePath: string): RequirementWithSource {
    return {
      id,
      title: "Test",
      description: "",
      sourcePath,
    };
  }

  it("defaultRules includes at least GRD-VALID-002", () => {
    const ids = defaultRules.map((r) => r.id);
    expect(ids).toContain("GRD-VALID-002");
  });

  it("defaultGlobalRules includes GRD-VALID-003, GRD-VALID-004, and GRD-VALID-005", () => {
    const ids = defaultGlobalRules.map((r) => r.id);
    expect(ids).toContain("GRD-VALID-003");
    expect(ids).toContain("GRD-VALID-004");
    expect(ids).toContain("GRD-VALID-005");
  });

  it("runGlobalRules returns duplicate id errors (GRD-VALID-003)", () => {
    const requirements = [
      req("SAME-ID", path.join("/p", "SAME-ID.req.yml")),
      req("SAME-ID", path.join("/p", "other", "SAME-ID.req.yml")),
    ];
    const errors = runGlobalRules(requirements);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain("Duplicate requirement id");
    expect(errors[0]!.message).toContain("SAME-ID");
  });

  it("runGlobalRules returns no errors when ids are unique", () => {
    const requirements = [
      req("A", path.join("/p", "A.req.yml")),
      req("B", path.join("/p", "B.req.yml")),
    ];
    const errors = runGlobalRules(requirements);
    expect(errors).toEqual([]);
  });

  it("runGlobalRules returns unknown id errors (GRD-VALID-004)", () => {
    const requirements = [
      req("A", path.join("/p", "A.req.yml")),
      {
        ...req("B", path.join("/p", "B.req.yml")),
        links: [{ satisfies: "MISSING-ID" }],
      },
    ];
    const errors = runGlobalRules(requirements);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toContain("references unknown id");
    expect(errors[0]!.message).toContain("MISSING-ID");
  });

  it("runGlobalRules returns no errors when link references exist", () => {
    const requirements = [
      req("A", path.join("/p", "A.req.yml")),
      {
        ...req("B", path.join("/p", "B.req.yml")),
        links: [{ satisfies: "A" }],
      },
    ];
    const errors = runGlobalRules(requirements);
    expect(errors).toEqual([]);
  });

  it("runGlobalRules returns no errors when links are acyclic (GRD-VALID-005)", () => {
    const requirements = [
      req("A", path.join("/p", "A.req.yml")),
      { ...req("B", path.join("/p", "B.req.yml")), links: [{ satisfies: "A" }] },
      { ...req("C", path.join("/p", "C.req.yml")), links: [{ satisfies: "B" }] },
    ];
    const errors = runGlobalRules(requirements);
    expect(errors).toEqual([]);
  });

  it("runGlobalRules returns cycle error for direct self-link (GRD-VALID-005)", () => {
    const requirements = [
      {
        ...req("A", path.join("/p", "A.req.yml")),
        links: [{ satisfies: "A" }],
      },
    ];
    const errors = runGlobalRules(requirements);
    const cycleErrors = errors.filter((e) => e.message.includes("Cycle in requirement links"));
    expect(cycleErrors).toHaveLength(1);
    expect(cycleErrors[0]!.message).toBe("Cycle in requirement links: A -> A");
    expect(cycleErrors[0]!.path).toBe(path.join("/p", "A.req.yml"));
  });

  it("runGlobalRules returns cycle error for A -> B -> A (GRD-VALID-005)", () => {
    const requirements = [
      req("A", path.join("/p", "A.req.yml")),
      {
        ...req("B", path.join("/p", "B.req.yml")),
        links: [{ satisfies: "A" }],
      },
    ];
    (requirements[0] as RequirementWithSource).links = [{ satisfies: "B" }];
    const errors = runGlobalRules(requirements);
    const cycleErrors = errors.filter((e) => e.message.includes("Cycle in requirement links"));
    expect(cycleErrors).toHaveLength(1);
    expect(cycleErrors[0]!.message).toMatch(/Cycle in requirement links: (A -> B -> A|B -> A -> B)/);
  });

  it("runGlobalRules returns cycle error for A -> B -> C -> A (GRD-VALID-005)", () => {
    const requirements = [
      req("A", path.join("/p", "A.req.yml")),
      { ...req("B", path.join("/p", "B.req.yml")), links: [{ satisfies: "A" }] },
      { ...req("C", path.join("/p", "C.req.yml")), links: [{ satisfies: "B" }] },
    ];
    (requirements[0] as RequirementWithSource).links = [{ satisfies: "C" }];
    const errors = runGlobalRules(requirements);
    const cycleErrors = errors.filter((e) => e.message.includes("Cycle in requirement links"));
    expect(cycleErrors).toHaveLength(1);
    expect(cycleErrors[0]!.message).toContain("Cycle in requirement links");
    expect(cycleErrors[0]!.message).toContain("A");
    expect(cycleErrors[0]!.message).toContain("B");
    expect(cycleErrors[0]!.message).toContain("C");
  });

  it("runRules runs default rules and returns filename-id errors", () => {
    const requirements = [
      req("GRD-VALID-001", path.join("/p", "GRD-VALID-002.req.yml")),
    ];
    const errors = runRules(requirements);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some((e) => e.message.includes("does not match filename"))).toBe(true);
  });

  it("runRules returns no errors when all rules pass", () => {
    const requirements = [
      req("GRD-VALID-001", path.join("/p", "GRD-VALID-001.req.yml")),
      req("GRD-VALID-002", path.join("/p", "GRD-VALID-002.req.yml")),
    ];
    const errors = runRules(requirements);
    expect(errors).toEqual([]);
  });

  it("runRules accepts custom rules", () => {
    const requirements = [req("X", path.join("/p", "X.req.yml"))];
    const customErrors = runRules(requirements, [
      {
        id: "custom",
        run: (r) => [{ path: r.sourcePath, message: "custom rule failed" }],
      },
    ]);
    expect(customErrors).toHaveLength(1);
    expect(customErrors[0]!.message).toBe("custom rule failed");
  });
});
