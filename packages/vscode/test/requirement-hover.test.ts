/**
 * GRD-VSC-007: Hover resolves requirement ids in YAML text to titles (unit tests for id detection).
 */
import { findRequirementIdAtLinePosition } from "../src/requirement-id-at-position.js";

describe("GRD-VSC-007: findRequirementIdAtLinePosition", () => {
  it("returns id on satisfies line when cursor is on the id", () => {
    const line = "  satisfies: GRD-SYS-001";
    const gIndex = line.indexOf("GRD");
    expect(findRequirementIdAtLinePosition(line, gIndex)).toBe("GRD-SYS-001");
    expect(findRequirementIdAtLinePosition(line, gIndex + 5)).toBe("GRD-SYS-001");
  });

  it("returns id inside quoted satisfies value", () => {
    const line = `  satisfies: 'GRD-CLI-002'`;
    const gIndex = line.indexOf("GRD");
    expect(findRequirementIdAtLinePosition(line, gIndex)).toBe("GRD-CLI-002");
  });

  it("returns id in description text", () => {
    const line = "  See GRD-HTML-001 for layout rules.";
    const gIndex = line.indexOf("GRD");
    expect(findRequirementIdAtLinePosition(line, gIndex)).toBe("GRD-HTML-001");
  });

  it("returns null when cursor is on a key without hyphenated id", () => {
    const line = "id: GRD-TEST-001";
    const iIndex = line.indexOf("id");
    expect(findRequirementIdAtLinePosition(line, iIndex)).toBeNull();
  });

  it("returns id on the id field value", () => {
    const line = "id: GRD-TEST-001";
    const gIndex = line.indexOf("GRD");
    expect(findRequirementIdAtLinePosition(line, gIndex)).toBe("GRD-TEST-001");
  });

  it("returns null when cursor is on whitespace", () => {
    const line = "  satisfies: GRD-SYS-001";
    expect(findRequirementIdAtLinePosition(line, 0)).toBeNull();
  });

  it("returns null when no id on line", () => {
    expect(findRequirementIdAtLinePosition("title: Plain title", 10)).toBeNull();
  });
});
