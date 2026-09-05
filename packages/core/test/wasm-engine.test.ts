/**
 * WASM facade smoke tests: init bindings, parse, validate, schema, and single-requirement HTML.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  exportRequirementFileJsonSchema,
  formatRequirementToYaml,
  generateSingleRequirementHtml,
  loadRequirements,
  loadWasmBindings,
  parseRequirementContent,
  validateRequirements,
} from "@gitreqd/core";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const SAMPLE = path.join(REPO_ROOT, "sample_projects", "basic");
const FIXTURE_PATH = path.join(SAMPLE, "system", "SYS-001.req.yml");

describe("gitreqd WASM core facade", () => {
  beforeAll(() => {
    loadWasmBindings();
  });

  it("parses requirement YAML and returns the id", () => {
    const yaml = `id: GRD-WASM-001
title: WASM parse fixture
require: The facade shall parse this requirement.
refinement: Supporting detail.
`;
    const result = parseRequirementContent(yaml, "GRD-WASM-001.req.yml");
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.requirement.id).toBe("GRD-WASM-001");
    expect(result.requirement.title).toBe("WASM parse fixture");
    expect(result.requirement.require).toContain("shall parse");
  });

  it("validates a well-formed requirement with no errors", () => {
    const parsed = parseRequirementContent(
      `id: GRD-WASM-002
title: Valid
require: The system shall be valid.
`,
      "/tmp/GRD-WASM-002.req.yml"
    );
    expect("error" in parsed).toBe(false);
    if ("error" in parsed) return;
    expect(validateRequirements([parsed.requirement])).toEqual([]);
  });

  it("exports JSON Schema keys used by the VS Code YAML language service", () => {
    const schema = exportRequirementFileJsonSchema() as {
      type?: string;
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(schema.type).toBe("object");
    expect(schema.required).toEqual(expect.arrayContaining(["id", "title", "require"]));
    expect(schema.properties).toBeDefined();
    expect(schema.properties!.id).toBeDefined();
    expect(schema.properties!.require).toBeDefined();
    expect(schema.properties!.refinement).toBeDefined();
    expect(schema.properties!.satisfied_by).toBeDefined();
  });

  it("formats a requirement to YAML that includes the id", () => {
    const parsed = parseRequirementContent(
      `id: GRD-WASM-003
title: Format me
require: The formatter shall emit YAML.
`,
      "/tmp/GRD-WASM-003.req.yml"
    );
    expect("error" in parsed).toBe(false);
    if ("error" in parsed) return;
    const yaml = formatRequirementToYaml(parsed.requirement);
    expect(yaml).toContain("id: GRD-WASM-003");
    expect(yaml).toContain("require:");
  });

  it("generates single-requirement HTML containing the id and optional field markers", () => {
    const parsed = parseRequirementContent(
      `id: GRD-WASM-004
title: HTML fixture
require: The HTML renderer shall include this id.
refinement: Extra prose.
attributes:
  rationale: Why this exists.
`,
      "/tmp/GRD-WASM-004.req.yml"
    );
    expect("error" in parsed).toBe(false);
    if ("error" in parsed) return;
    const html = generateSingleRequirementHtml(parsed.requirement, [parsed.requirement], {
      editableFieldMarkers: true,
    });
    expect(html).toContain("GRD-WASM-004");
    expect(html).toContain('class="require"');
    expect(html).toContain('data-gitreqd-field="require"');
    expect(html).toContain('data-gitreqd-field="refinement"');
    expect(html).toContain('data-gitreqd-field="rationale"');
  });

  it("loads requirements from the basic sample project via the Node fs adapter", async () => {
    const result = await loadRequirements(SAMPLE);
    expect(result.errors).toEqual([]);
    expect(result.requirements.length).toBeGreaterThan(0);
    expect(result.requirements.some((r) => r.id === "SYS-001")).toBe(true);
    expect(result.requirements.some((r) => r.sourcePath.includes("SYS-001"))).toBe(true);
  });

  it("parses a sample requirement file from disk", () => {
    const yaml = fs.readFileSync(FIXTURE_PATH, "utf-8");
    const result = parseRequirementContent(yaml, FIXTURE_PATH);
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.requirement.id).toBe("SYS-001");
  });

  it("loads wasm from the package dist when process.cwd is not the repo root", () => {
    const distIndex = path.join(REPO_ROOT, "packages", "core", "dist", "index.js");
    expect(fs.existsSync(distIndex)).toBe(true);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-wasm-cwd-"));
    const spec = pathToFileURL(distIndex).href;
    const script = `
      import { parseRequirementContent } from ${JSON.stringify(spec)};
      const r = parseRequirementContent(
        "id: GRD-WASM-CWD\\ntitle: Cwd\\nrequire: The loader shall not use process.cwd().\\n",
        "GRD-WASM-CWD.req.yml"
      );
      if ("error" in r) throw new Error(r.error.message);
      if (r.requirement.id !== "GRD-WASM-CWD") throw new Error(r.requirement.id);
    `;
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: tmp,
      encoding: "utf-8",
    });
  });
});
