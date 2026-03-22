/**
 * GRD-CLI-005: CLI schema command — emit project requirement schema.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT_MARKER } from "@gitreqd/core";
import { runSchema } from "../src/schema-cmd";

describe("GRD-CLI-005: CLI schema command", () => {
  function makeProjectWithMarker(): string {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-schema-"));
    fs.writeFileSync(
      path.join(tmp, ROOT_MARKER),
      "requirement_dirs:\n  - requirements\n",
      "utf-8"
    );
    fs.mkdirSync(path.join(tmp, "requirements"), { recursive: true });
    return tmp;
  }

  it("writes JSON Schema with type object and required id/title", async () => {
    const project = makeProjectWithMarker();
    const out = path.join(project, "schema.json");
    const result = await runSchema(project, { format: "json-schema", outputFile: out });
    expect(result.success).toBe(true);
    const raw = fs.readFileSync(out, "utf-8");
    const parsed = JSON.parse(raw) as { type?: string; required?: string[] };
    expect(parsed.type).toBe("object");
    expect(parsed.required).toContain("id");
    expect(parsed.required).toContain("title");
  });

  it("writes YAML format when requested", async () => {
    const project = makeProjectWithMarker();
    const out = path.join(project, "schema.yaml");
    const result = await runSchema(project, { format: "yaml", outputFile: out });
    expect(result.success).toBe(true);
    const raw = fs.readFileSync(out, "utf-8");
    expect(raw.trim().length).toBeGreaterThan(0);
    expect(raw).toMatch(/^type:/m);
  });

  it("fails when no project root marker exists", async () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-schema-"));
    const result = await runSchema(project, { format: "json-schema" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No project root found/);
  });
});
