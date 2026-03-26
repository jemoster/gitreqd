/**
 * GRD-CLI-006: format command reports success without throwing.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { REQUIREMENT_FILE_EXTENSION, ROOT_MARKER } from "@gitreqd/core";
import { runFormat } from "../src/format-cmd";

describe("GRD-CLI-006: runFormat", () => {
  it("formats requirement files in a temp project", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-cli-fmt-"));
    const reqs = path.join(projectRoot, "requirements");
    fs.mkdirSync(reqs, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, ROOT_MARKER), "requirement_dirs:\n  - requirements\n", "utf-8");
    fs.writeFileSync(
      path.join(reqs, `GRD-CLI-FMT-001${REQUIREMENT_FILE_EXTENSION}`),
      "id: GRD-CLI-FMT-001\ntitle: T\ndescription: 'x'\n",
      "utf-8"
    );

    const { success, writtenCount, skippedCount } = await runFormat(projectRoot);

    expect(success).toBe(true);
    expect(writtenCount).toBe(1);
    expect(skippedCount).toBe(0);
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
    errSpy.mockRestore();
  });
});
