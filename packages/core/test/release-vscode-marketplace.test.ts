/**
 * GRD-VSC-008: Release automation publishes the shallgraph VS Code extension to the Visual Studio Marketplace.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const VSCODE_PKG = path.join(REPO_ROOT, "packages", "vscode", "package.json");
const VSCODE_LICENSE = path.join(REPO_ROOT, "packages", "vscode", "LICENSE");
const VSCODE_README = path.join(REPO_ROOT, "packages", "vscode", "README.md");
const VSCODE_RELEASE_WORKFLOW = path.join(REPO_ROOT, ".github", "workflows", "release-vscode.yml");
const PUBLISH_SCRIPT = path.join(REPO_ROOT, "scripts", "publish-vscode-marketplace.sh");
const RELEASE_GUIDE = path.join(REPO_ROOT, "release.md");
const DEV_GUIDE = path.join(REPO_ROOT, "dev.md");
const README = path.join(REPO_ROOT, "README.md");

const MARKETPLACE_ITEM =
  "https://marketplace.visualstudio.com/items?itemName=shallgraph.shallgraph-vscode";

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;
}

describe("GRD-VSC-008: Visual Studio Marketplace publication", () => {
  it("extension manifest identifies the marketplace listing and git repository", () => {
    const pkg = readJson(VSCODE_PKG);
    expect(pkg.name).toBe("shallgraph-vscode");
    expect(pkg.publisher).toBe("shallgraph");
    expect(pkg.license).toBe("MIT");
    const repository = pkg.repository as { type?: string; url?: string };
    expect(repository).toEqual({
      type: "git",
      url: "https://github.com/jemoster/gitreqd.git",
    });
    expect(pkg.homepage).toBe(MARKETPLACE_ITEM);
    const scripts = pkg.scripts as Record<string, string>;
    expect(scripts.package).toContain("vsce package");
    expect(scripts.package).not.toContain("--allow-missing-repository");
    expect(scripts["publish-marketplace"]).toContain("vsce publish");
    expect(scripts["publish-marketplace"]).toContain("--skip-duplicate");
    const ignore = fs.readFileSync(path.join(REPO_ROOT, "packages", "vscode", ".vscodeignore"), "utf-8");
    expect(ignore).toContain("webview/**");
    expect(ignore).toContain(".gitignore");
  });

  it("extension LICENSE allows redistribution (MIT)", () => {
    const license = fs.readFileSync(VSCODE_LICENSE, "utf-8");
    expect(license).toContain("MIT License");
    expect(license).toContain("Permission is hereby granted");
    expect(license).not.toMatch(/internal testing/i);
    expect(license).not.toMatch(/No use, copying, modification, redistribution/i);
  });

  it("publish script publishes the packaged VSIX with VSCE_PAT", () => {
    const script = fs.readFileSync(PUBLISH_SCRIPT, "utf-8");
    expect(script).toContain("GRD-VSC-008");
    expect(script).toContain("VSCE_PAT");
    expect(script).toContain("npx vsce publish");
    expect(script).toContain("--packagePath");
    expect(script).toContain("shallgraph-vscode-*.vsix");
    expect(script).toContain("SHALLGRAPH_VSIX_DIR");
    expect(script).toContain("--skip-duplicate");
    expect(script).toContain(MARKETPLACE_ITEM);
  });

  it("publish script fails when VSCE_PAT is missing or no VSIX is present", () => {
    const envWithoutPat = { ...process.env };
    delete envWithoutPat.VSCE_PAT;
    const withoutPat = spawnSync("bash", [PUBLISH_SCRIPT], {
      encoding: "utf-8",
      env: envWithoutPat,
    });
    expect(withoutPat.status).not.toBe(0);
    expect(`${withoutPat.stdout}${withoutPat.stderr}`).toContain("VSCE_PAT");

    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "shallgraph-grd-vsc-008-"));
    const withoutVsix = spawnSync("bash", [PUBLISH_SCRIPT], {
      encoding: "utf-8",
      env: { ...process.env, VSCE_PAT: "test-token", SHALLGRAPH_VSIX_DIR: emptyDir },
    });
    expect(withoutVsix.status).not.toBe(0);
    expect(`${withoutVsix.stdout}${withoutVsix.stderr}`).toMatch(/expected exactly one VSIX/i);
  });

  it("release workflow uploads the VSIX to GitHub and then publishes it to the marketplace", () => {
    const workflow = fs.readFileSync(VSCODE_RELEASE_WORKFLOW, "utf-8");
    expect(workflow).toContain("GRD-VSC-008");
    expect(workflow).toContain("release:");
    expect(workflow).toContain("types: [published]");
    expect(workflow).toContain("npm run package -w shallgraph-vscode");
    expect(workflow).toContain('python3 ./scripts/assert-release-tag.py "${{ github.event.release.tag_name }}" vscode');
    expect(workflow).toContain('gh release upload "${{ github.event.release.tag_name }}"');
    expect(workflow).toContain("secrets.VSCE_PAT");
    expect(workflow).toContain("bash ./scripts/publish-vscode-marketplace.sh");
    const assertIdx = workflow.indexOf("assert-release-tag.py");
    const uploadIdx = workflow.indexOf("gh release upload");
    const publishIdx = workflow.indexOf("publish-vscode-marketplace.sh");
    expect(assertIdx).toBeGreaterThan(-1);
    expect(uploadIdx).toBeGreaterThan(assertIdx);
    expect(publishIdx).toBeGreaterThan(uploadIdx);
  });

  it("user docs describe marketplace install as the supported path", () => {
    const vscodeReadme = fs.readFileSync(VSCODE_README, "utf-8");
    expect(vscodeReadme).toContain(MARKETPLACE_ITEM);
    expect(vscodeReadme).toContain("shallgraph.shallgraph-vscode");
    expect(vscodeReadme).toMatch(/Extensions view/i);

    const guide = fs.readFileSync(RELEASE_GUIDE, "utf-8");
    expect(guide).toContain("VSCE_PAT");
    expect(guide).toContain("Visual Studio Marketplace");
    expect(guide).toContain(MARKETPLACE_ITEM);

    const dev = fs.readFileSync(DEV_GUIDE, "utf-8");
    expect(dev).toContain(MARKETPLACE_ITEM);

    const readme = fs.readFileSync(README, "utf-8");
    expect(readme).toContain(MARKETPLACE_ITEM);
  });
});
