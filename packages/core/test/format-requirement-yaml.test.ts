/**
 * GRD-SYS-011: Canonical requirement YAML formatting.
 * GRD-CLI-006: Project-wide format uses the same serialization and skip-write rules.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT_MARKER } from "../src/discovery";
import { formatProjectRequirementFiles } from "../src/format-project";
import {
  formatRequirementToYaml,
  normalizeRequirementFileTextForCompare,
} from "../src/format-requirement-yaml";
import { parseRequirementContent } from "../src/parse";
import { REQUIREMENT_FILE_EXTENSION } from "../src/requirement-files";

describe("GRD-SYS-011: formatRequirementToYaml", () => {
  it("is idempotent for parsed requirements", () => {
    const yaml = `id: GRD-T-001
title: T
description: |-
  One
  Two
attributes:
  z: 1
  a: 2
links:
  - satisfies: GRD-X
parameters:
  beta: true
  alpha: 1
`;
    const parsed = parseRequirementContent(yaml, `/x${REQUIREMENT_FILE_EXTENSION}`);
    expect("error" in parsed).toBe(false);
    if ("error" in parsed) {
      return;
    }
    const once = formatRequirementToYaml(parsed.requirement);
    const again = parseRequirementContent(once, `/x${REQUIREMENT_FILE_EXTENSION}`);
    expect("error" in again).toBe(false);
    if ("requirement" in again) {
      const twice = formatRequirementToYaml(again.requirement);
      expect(twice).toBe(once);
    }
  });

  it("uses block clip chomping (|) for multiline description, not strip (|-)", () => {
    const once = formatRequirementToYaml({
      id: "GRD-T-Pipe",
      title: "T",
      description: "One\nTwo",
      attributes: { rationale: "A\nB" },
    });
    expect(once).toMatch(/^description: \|(\r?\n)/m);
    expect(once).not.toContain("description: |-");
    expect(once).toMatch(/^([ \t]*)rationale: \|(\r?\n)/m);
    expect(once).not.toContain("rationale: |-");
  });

  it("orders top-level keys as id, title, description, attributes, links, parameters", () => {
    const yaml = formatRequirementToYaml({
      id: "GRD-T-002",
      title: "Title",
      description: "d",
      attributes: { status: "active" },
      links: [{ satisfies: "GRD-A" }],
      parameters: { p: 1 },
    });
    const lines = yaml.split("\n").filter((l) => l.length > 0);
    expect(lines[0]).toMatch(/^id:/);
    expect(lines[1]).toMatch(/^title:/);
    expect(lines[2]).toMatch(/^description:/);
    expect(lines.some((l) => l.startsWith("attributes:"))).toBe(true);
    expect(lines.indexOf("attributes:")).toBeLessThan(lines.findIndex((l) => l.startsWith("links:")));
    expect(lines.findIndex((l) => l.startsWith("links:"))).toBeLessThan(
      lines.findIndex((l) => l.startsWith("parameters:"))
    );
  });

  it("sorts attribute and parameter keys alphabetically", () => {
    const yaml = formatRequirementToYaml({
      id: "GRD-T-003",
      title: "T",
      description: "",
      attributes: { zebra: 1, apple: 2 },
      parameters: { z: false, a: true },
    });
    const aIdx = yaml.indexOf("apple:");
    const zAttrIdx = yaml.indexOf("zebra:");
    expect(aIdx).toBeGreaterThan(-1);
    expect(zAttrIdx).toBeGreaterThan(aIdx);
    const aParam = yaml.indexOf("\n  a:");
    const zParam = yaml.indexOf("\n  z:");
    expect(aParam).toBeGreaterThan(-1);
    expect(zParam).toBeGreaterThan(aParam);
  });
});

describe("normalizeRequirementFileTextForCompare", () => {
  it("treats CRLF and trailing whitespace as equivalent for skip-write", () => {
    const canonical = formatRequirementToYaml({
      id: "GRD-T-004",
      title: "T",
      description: "x",
    });
    const messy = `${canonical.trimEnd().replace(/\n/g, "\r\n")}  \r\n\r\n`;
    expect(normalizeRequirementFileTextForCompare(messy)).toBe(normalizeRequirementFileTextForCompare(canonical));
  });
});

describe("GRD-CLI-006: formatProjectRequirementFiles", () => {
  function makeProject(reqBody: string): string {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-fmt-"));
    const reqs = path.join(projectRoot, "requirements");
    fs.mkdirSync(reqs, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, ROOT_MARKER), "requirement_dirs:\n  - requirements\n", "utf-8");
    fs.writeFileSync(path.join(reqs, `GRD-FMT-001${REQUIREMENT_FILE_EXTENSION}`), reqBody, "utf-8");
    return projectRoot;
  }

  it("rewrites non-canonical files and skips already-canonical files", async () => {
    const projectRoot = makeProject(`id: GRD-FMT-001
title: One
description: 'x'
`);
    const filePath = path.join(
      projectRoot,
      "requirements",
      `GRD-FMT-001${REQUIREMENT_FILE_EXTENSION}`
    );
    const first = await formatProjectRequirementFiles(projectRoot);
    expect(first.success).toBe(true);
    expect(first.writtenPaths).toHaveLength(1);
    expect(first.skippedPaths).toHaveLength(0);

    const second = await formatProjectRequirementFiles(projectRoot);
    expect(second.success).toBe(true);
    expect(second.writtenPaths).toHaveLength(0);
    expect(second.skippedPaths).toEqual([filePath]);

    const after = fs.readFileSync(filePath, "utf-8");
    const parsed = parseRequirementContent(after, filePath);
    expect("error" in parsed).toBe(false);
  });

  it("does not write when any file fails to parse", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-fmt-bad-"));
    const reqs = path.join(projectRoot, "requirements");
    fs.mkdirSync(reqs, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, ROOT_MARKER), "requirement_dirs:\n  - requirements\n", "utf-8");
    fs.writeFileSync(
      path.join(reqs, `GRD-GOOD${REQUIREMENT_FILE_EXTENSION}`),
      "id: GRD-GOOD\ntitle: Ok\ndescription: x\n",
      "utf-8"
    );
    fs.writeFileSync(
      path.join(reqs, `GRD-BAD${REQUIREMENT_FILE_EXTENSION}`),
      "not: valid requirement\n",
      "utf-8"
    );

    const goodPath = path.join(reqs, `GRD-GOOD${REQUIREMENT_FILE_EXTENSION}`);
    const before = fs.readFileSync(goodPath, "utf-8");

    const result = await formatProjectRequirementFiles(projectRoot);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.writtenPaths).toHaveLength(0);
    expect(fs.readFileSync(goodPath, "utf-8")).toBe(before);
  });
});
