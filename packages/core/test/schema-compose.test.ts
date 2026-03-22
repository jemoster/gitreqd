/**
 * GRD-CLI-005 / GRD-SYS-009: Schema compose options from project marker.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT_MARKER } from "../src/discovery";
import { requirementSchemaComposeOptionsForProject } from "../src/schema-compose";

describe("requirementSchemaComposeOptionsForProject", () => {
  it("returns undefined for a directory without a root marker", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-compose-"));
    expect(requirementSchemaComposeOptionsForProject(tmp)).toBeUndefined();
  });

  it("does not throw when marker exists with valid YAML", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-compose-"));
    fs.writeFileSync(
      path.join(tmp, ROOT_MARKER),
      "requirement_dirs:\n  - requirements\n",
      "utf-8"
    );
    expect(() => requirementSchemaComposeOptionsForProject(tmp)).not.toThrow();
  });
});
