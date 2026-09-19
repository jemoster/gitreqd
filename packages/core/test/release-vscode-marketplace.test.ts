/**
 * GRD-VSC-008: Runtime checks for the Visual Studio Marketplace publish script.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PUBLISH_SCRIPT = path.resolve(__dirname, "../../../scripts/publish-vscode-marketplace.sh");

function runPublish(env: NodeJS.ProcessEnv): { status: number | null; output: string } {
  const result = spawnSync("bash", [PUBLISH_SCRIPT], {
    encoding: "utf-8",
    env,
  });
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
  };
}

describe("GRD-VSC-008: Visual Studio Marketplace publish script", () => {
  it("exits when VSCE_PAT is unset", () => {
    const env = { ...process.env };
    delete env.VSCE_PAT;
    const result = runPublish(env);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("VSCE_PAT is not set");
  });

  it("exits when the VSIX directory has no packaged extension", () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "shallgraph-grd-vsc-008-"));
    const result = runPublish({
      ...process.env,
      VSCE_PAT: "test-token",
      SHALLGRAPH_VSIX_DIR: emptyDir,
    });
    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(/expected exactly one VSIX/i);
    expect(result.output).toContain(emptyDir);
  });

  it("exits when more than one VSIX is present", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shallgraph-grd-vsc-008-"));
    fs.writeFileSync(path.join(dir, "shallgraph-vscode-0.1.0.vsix"), "");
    fs.writeFileSync(path.join(dir, "shallgraph-vscode-0.2.0.vsix"), "");
    const result = runPublish({
      ...process.env,
      VSCE_PAT: "test-token",
      SHALLGRAPH_VSIX_DIR: dir,
    });
    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(/expected exactly one VSIX/i);
    expect(result.output).toContain("found 2");
  });
});
