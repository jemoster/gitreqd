/**
 * GRD-SYS-016: satisfied_by and verified_by artifact traceability fields.
 */
import {
  exportRequirementFileJsonSchema,
  requirementFileDataSchema,
} from "../src/requirement-schema";

describe("GRD-SYS-016 artifact traceability fields", () => {
  it("parses satisfied_by and verified_by with artifact and optional description", () => {
    const r = requirementFileDataSchema.safeParse({
      id: "GRD-X-001",
      title: "T",
      require: "The system shall do X.",
      satisfied_by: [
        { artifact: "src/foo.ts", description: "Implements X." },
        { artifact: "https://example.com/spec" },
      ],
      verified_by: [{ artifact: "test/foo.test.ts" }],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.satisfied_by).toEqual([
        { artifact: "src/foo.ts", description: "Implements X." },
        { artifact: "https://example.com/spec" },
      ]);
      expect(r.data.verified_by).toEqual([{ artifact: "test/foo.test.ts" }]);
    }
  });

  it("trims artifact and description strings", () => {
    const r = requirementFileDataSchema.safeParse({
      id: "GRD-X-002",
      title: "T",
      require: "The system shall do Y.",
      satisfied_by: [{ artifact: "  path.ts  ", description: "  note  " }],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.satisfied_by).toEqual([{ artifact: "path.ts", description: "note" }]);
    }
  });

  it("rejects artifact entry missing artifact", () => {
    const r = requirementFileDataSchema.safeParse({
      id: "GRD-X-003",
      title: "T",
      require: "The system shall do Z.",
      satisfied_by: [{ description: "no path" }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown keys on artifact entries", () => {
    const r = requirementFileDataSchema.safeParse({
      id: "GRD-X-004",
      title: "T",
      require: "The system shall do W.",
      verified_by: [{ artifact: "a.ts", extra: 1 }],
    });
    expect(r.success).toBe(false);
  });

  it("exportRequirementFileJsonSchema includes satisfied_by and verified_by", () => {
    const json = exportRequirementFileJsonSchema() as {
      properties?: Record<string, unknown>;
    };
    expect(json.properties!.satisfied_by).toBeDefined();
    expect(json.properties!.verified_by).toBeDefined();
  });
});
