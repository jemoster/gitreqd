/**
 * GRD-GIT-002: Merge-conflict resolution for requirement files.
 */
import {
  reconstructSides,
  hasConflictMarkers,
  resolveRequirementConflicts,
  type MergeFieldFn,
} from "../src/conflicts.js";
import type { LlmRuntimeConfig } from "../src/llm-config.js";

describe("GRD-GIT-002: merge-conflict resolution", () => {
  describe("reconstructSides", () => {
    it("returns null when content has no conflict markers", () => {
      const content = "id: X\ntitle: Y\nrequire: The system shall do Z.\n";
      expect(reconstructSides(content)).toBeNull();
    });

    it("reconstructs ours and theirs from a single conflict region", () => {
      const content = [
        "id: A",
        "title: One",
        "require: The system shall do one.",
        "refinement: |",
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
        "require: The system shall do m.",
        "<<<<<<< H",
        "title: OursTitle",
        "=======",
        "title: TheirsTitle",
        ">>>>>>> B",
        "<<<<<<< H",
        "refinement: OursRef",
        "=======",
        "refinement: TheirsRef",
        ">>>>>>> B",
      ].join("\n");
      const sides = reconstructSides(content);
      expect(sides).not.toBeNull();
      expect(sides!.ours).toContain("OursTitle");
      expect(sides!.ours).toContain("OursRef");
      expect(sides!.theirs).toContain("TheirsTitle");
      expect(sides!.theirs).toContain("TheirsRef");
    });
  });

  describe("hasConflictMarkers", () => {
    it("returns false for plain YAML", () => {
      expect(hasConflictMarkers("id: X\ntitle: Y\nrequire: The system shall.\n")).toBe(false);
    });

    it("returns true when conflict markers are present", () => {
      const content = "a\n<<<<<<< H\nx\n=======\ny\n>>>>>>> B\nb";
      expect(hasConflictMarkers(content)).toBe(true);
    });
  });

  describe("resolveRequirementConflicts", () => {
    const filePath = "/fake/GRD-CONFLICT-001.req.yml";
    const llmConfig: LlmRuntimeConfig = { provider: "ollama", base_url: "http://localhost:11434", model: "test" };

    function mockMergeField(returns: Record<string, string>): MergeFieldFn {
      return async (fieldName) => Promise.resolve(returns[fieldName] ?? "");
    }

    it("returns error when content has no valid conflict markers", async () => {
      const result = await resolveRequirementConflicts(
        "id: X\ntitle: Y\nrequire: The system shall.\n",
        filePath,
        llmConfig,
        { mergeField: mockMergeField({}) }
      );
      expect("error" in result).toBe(true);
      if ("error" in result) expect(result.error.message).toContain("No valid conflict markers");
    });

    it("resolves when title/require/refinement/rationale are identical in both sides (no LLM call)", async () => {
      const content = [
        "id: SAME-001",
        "title: Same title",
        "require: The system shall stay the same.",
        "refinement: |",
        "  Same refinement.",
        "<<<<<<< HEAD",
        "  Same refinement.",
        "=======",
        "  Same refinement.",
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
      const result = await resolveRequirementConflicts(content, filePath, llmConfig, { mergeField: mockMergeField({}) });
      expect("resolved" in result).toBe(true);
      if ("resolved" in result) {
        expect(result.resolved).toContain("SAME-001");
        expect(result.resolved).toContain("Same title");
        expect(result.resolved).toMatch(/Same refinement/);
        expect(result.resolved).toMatch(/Same rationale/);
        expect(result.resolved).toMatch(/status:\s*active/);
        expect(result.resolved).toMatch(/links:\s*\[\]/);
      }
    });

    it("preserves all fields (id, title, require, refinement, attributes, links) in merged output", async () => {
      const content = [
        "id: PRESERVE-001",
        "title: T",
        "require: The system shall preserve.",
        "<<<<<<< H",
        "refinement: Ours",
        "=======",
        "refinement: Theirs",
        ">>>>>>> B",
        "attributes:",
        "  status: active",
        "  rationale: R",
        "links: []",
      ].join("\n");
      const result = await resolveRequirementConflicts(content, filePath, llmConfig, {
        mergeField: mockMergeField({ refinement: "Merged refinement." }),
      });
      expect("resolved" in result).toBe(true);
      if ("resolved" in result) {
        expect(result.resolved).toContain("PRESERVE-001");
        expect(result.resolved).toContain("T");
        expect(result.resolved).toContain("Merged refinement");
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
        "require: The system shall.",
        "<<<<<<< H",
        "=======",
        ">>>>>>> B",
      ].join("\n");
      const result = await resolveRequirementConflicts(content, filePath, llmConfig, {
        mergeField: mockMergeField({ title: "" }),
      });
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error.message).toMatch(
          /Missing required field|Expected an object|Invalid YAML|Unrecognized key|required/i
        );
      }
    });

    it("calls mergeField for differing fields and validates resolved content", async () => {
      const content = [
        "id: MERGE-001",
        "title: Title",
        "require: The system shall merge.",
        "<<<<<<< HEAD",
        "refinement: |",
        "  Ours refinement.",
        "=======",
        "refinement: |",
        "  Theirs refinement.",
        ">>>>>>> branch",
        "attributes:",
        "  rationale: Merged rationale.",
        "links: []",
      ].join("\n");
      const result = await resolveRequirementConflicts(content, filePath, llmConfig, {
        mergeField: mockMergeField({ refinement: "Merged refinement from both sides." }),
      });
      expect("resolved" in result).toBe(true);
      if ("resolved" in result) {
        expect(result.resolved).toContain("MERGE-001");
        expect(result.resolved).toContain("Merged refinement from both sides");
      }
    });
  });
});
