/**
 * GRD-GIT-002: Merge-conflict resolution for requirement files.
 */
import {
  reconstructSides,
  hasConflictMarkers,
  resolveRequirementConflicts,
  type OllamaConfig,
  type MergeFieldFn,
} from "../src/conflicts.js";

describe("GRD-GIT-002: merge-conflict resolution", () => {
  describe("reconstructSides", () => {
    it("returns null when content has no conflict markers", () => {
      const content = "id: X\ntitle: Y\ndescription: Z\n";
      expect(reconstructSides(content)).toBeNull();
    });

    it("reconstructs ours and theirs from a single conflict region", () => {
      const content = [
        "id: A",
        "title: One",
        "description: |",
        "<<<<<<< HEAD",
        "  Ours line.",
        "=======",
        "  Theirs line.",
        ">>>>>>> branch",
        "attributes: {}",
      ].join("\n");
      const sides = reconstructSides(content);
      expect(sides).not.toBeNull();
      expect(sides!.ours).toContain("Ours line.");
      expect(sides!.ours).not.toContain("Theirs line.");
      expect(sides!.theirs).toContain("Theirs line.");
      expect(sides!.theirs).not.toContain("Ours line.");
      expect(sides!.ours).toContain("id: A");
      expect(sides!.theirs).toContain("id: A");
      expect(sides!.ours).toContain("attributes: {}");
      expect(sides!.theirs).toContain("attributes: {}");
    });

    it("reconstructs multiple conflict regions", () => {
      const content = [
        "id: M",
        "<<<<<<< H",
        "title: OursTitle",
        "=======",
        "title: TheirsTitle",
        ">>>>>>> B",
        "<<<<<<< H",
        "description: OursDesc",
        "=======",
        "description: TheirsDesc",
        ">>>>>>> B",
      ].join("\n");
      const sides = reconstructSides(content);
      expect(sides).not.toBeNull();
      expect(sides!.ours).toContain("OursTitle");
      expect(sides!.ours).toContain("OursDesc");
      expect(sides!.theirs).toContain("TheirsTitle");
      expect(sides!.theirs).toContain("TheirsDesc");
    });
  });

  describe("hasConflictMarkers", () => {
    it("returns false for plain YAML", () => {
      expect(hasConflictMarkers("id: X\ntitle: Y\n")).toBe(false);
    });

    it("returns true when conflict markers are present", () => {
      const content = "a\n<<<<<<< H\nx\n=======\ny\n>>>>>>> B\nb";
      expect(hasConflictMarkers(content)).toBe(true);
    });
  });

  describe("resolveRequirementConflicts", () => {
    const filePath = "/fake/GRD-CONFLICT-001.req.yml";
    const ollamaConfig: OllamaConfig = { base_url: "http://localhost:11434", model: "test" };

    /** Mock merge: no LLM call, no logging. */
    function mockMergeField(returns: Record<string, string>): MergeFieldFn {
      return async (fieldName) => Promise.resolve(returns[fieldName] ?? "");
    }

    it("returns error when content has no valid conflict markers", async () => {
      const result = await resolveRequirementConflicts("id: X\ntitle: Y\n", filePath, ollamaConfig, { mergeField: mockMergeField({}) });
      expect("error" in result).toBe(true);
      if ("error" in result) expect(result.error.message).toContain("No valid conflict markers");
    });

    it("resolves when title/description/rationale are identical in both sides (no LLM call)", async () => {
      const content = [
        "id: SAME-001",
        "title: Same title",
        "description: |",
        "  Same description.",
        "<<<<<<< HEAD",
        "  Same description.",
        "=======",
        "  Same description.",
        ">>>>>>> branch",
        "attributes:",
        "  status: active",
        "  rationale: |",
        "    Same rationale.",
        "<<<<<<< HEAD",
        "    Same rationale.",
        "=======",
        "    Same rationale.",
        ">>>>>>> branch",
        "links: []",
      ].join("\n");
      const result = await resolveRequirementConflicts(content, filePath, ollamaConfig, { mergeField: mockMergeField({}) });
      expect("resolved" in result).toBe(true);
      if ("resolved" in result) {
        expect(result.resolved).toContain("SAME-001");
        expect(result.resolved).toContain("Same title");
        expect(result.resolved).toMatch(/Same description/);
        expect(result.resolved).toMatch(/Same rationale/);
        expect(result.resolved).toMatch(/status:\s*active/);
        expect(result.resolved).toMatch(/links:\s*\[\]/);
      }
    });

    it("preserves all fields (id, title, description, attributes, links) in merged output", async () => {
      const content = [
        "id: PRESERVE-001",
        "title: T",
        "<<<<<<< H",
        "description: Desc",
        "=======",
        "description: Other",
        ">>>>>>> B",
        "attributes:",
        "  status: active",
        "  rationale: R",
        "links: []",
      ].join("\n");
      const result = await resolveRequirementConflicts(content, filePath, ollamaConfig, {
        mergeField: mockMergeField({ description: "Merged desc." }),
      });
      expect("resolved" in result).toBe(true);
      if ("resolved" in result) {
        expect(result.resolved).toContain("PRESERVE-001");
        expect(result.resolved).toContain("T");
        expect(result.resolved).toContain("Merged desc");
        expect(result.resolved).toMatch(/status:\s*active/);
        expect(result.resolved).toMatch(/rationale/);
        expect(result.resolved).toMatch(/links:\s*\[\]/);
      }
    });

    it("returns error when resolved content does not match schema", async () => {
      const content = [
        "id: BAD",
        "<<<<<<< H",
        "title: O",
        "=======",
        "title: T",
        ">>>>>>> B",
        "description: d",
        "<<<<<<< H",
        "=======",
        ">>>>>>> B",
      ].join("\n");
      const result = await resolveRequirementConflicts(content, filePath, ollamaConfig, {
        mergeField: mockMergeField({ title: "" }),
      });
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error.message).toMatch(/Missing required field|Expected an object|Invalid YAML/);
      }
    });

    it("calls mergeField for differing fields and validates resolved content", async () => {
      const content = [
        "id: MERGE-001",
        "title: Title",
        "<<<<<<< HEAD",
        "description: |",
        "  Ours description.",
        "=======",
        "description: |",
        "  Theirs description.",
        ">>>>>>> branch",
        "attributes:",
        "  rationale: Merged rationale.",
        "links: []",
      ].join("\n");
      const result = await resolveRequirementConflicts(content, filePath, ollamaConfig, {
        mergeField: mockMergeField({ description: "Merged description from both sides." }),
      });
      expect("resolved" in result).toBe(true);
      if ("resolved" in result) {
        expect(result.resolved).toContain("MERGE-001");
        expect(result.resolved).toContain("Merged description from both sides");
      }
    });
  });
});
