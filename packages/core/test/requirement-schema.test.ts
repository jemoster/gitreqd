/**
 * GRD-SYS-009: Zod as single source of truth for requirement YAML; JSON Schema export.
 */
import {
  exportRequirementFileJsonSchema,
  requirementFileDataSchema,
} from "../src/requirement-schema";

describe("GRD-SYS-009 requirement schema (Zod)", () => {
  it("parses minimal object with default empty description", () => {
    const r = requirementFileDataSchema.safeParse({
      id: "GRD-X-001",
      title: "T",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.id).toBe("GRD-X-001");
      expect(r.data.title).toBe("T");
      expect(r.data.description).toBe("");
    }
  });

  it("rejects unknown top-level keys", () => {
    const r = requirementFileDataSchema.safeParse({
      id: "A",
      title: "B",
      extra: 1,
    });
    expect(r.success).toBe(false);
  });

  it("exportRequirementFileJsonSchema accepts optional compose options (reserved for runtime config)", () => {
    const json = exportRequirementFileJsonSchema({});
    expect(json.type).toBe("object");
  });

  it("exportRequirementFileJsonSchema returns a draft-07 object schema with id and title required", () => {
    const json = exportRequirementFileJsonSchema();
    expect(json.$schema).toBe("http://json-schema.org/draft-07/schema#");
    expect(json.type).toBe("object");
    const rec = json as { required?: string[]; properties?: Record<string, unknown> };
    expect(rec.required).toContain("id");
    expect(rec.required).toContain("title");
    expect(rec.properties).toBeDefined();
    expect(rec.properties!.parameters).toBeDefined();
  });
});
