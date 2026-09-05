/**
 * Release workflow publishes the WASM @gitreqd/core tarball (and native CLI in a sibling job).
 */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const CLI_RELEASE_WORKFLOW = path.join(REPO_ROOT, ".github", "workflows", "release-cli.yml");
const RELEASE_GUIDE = path.join(REPO_ROOT, "release.md");
const PACKAGE_SCRIPT = path.join(REPO_ROOT, "scripts", "package.sh");

describe("core tarball release artifacts", () => {
  it("packaging script packs only the @gitreqd/core tarball", () => {
    const script = fs.readFileSync(PACKAGE_SCRIPT, "utf-8");
    expect(script).toContain("npm pack --pack-destination");
    expect(script).toContain("packages/core");
    expect(script).not.toContain("packages/cli");
  });

  it("release workflow packages core tarballs and uploads them to GitHub Releases", () => {
    const workflow = fs.readFileSync(CLI_RELEASE_WORKFLOW, "utf-8");
    expect(workflow).toContain("release:");
    expect(workflow).toContain("types: [published]");
    expect(workflow).toContain("contents: write");
    expect(workflow).toContain("bash ./scripts/package.sh");
    expect(workflow).toContain("tgz_files=(release/*.tgz)");
    expect(workflow).toContain('gh release upload "${{ github.event.release.tag_name }}"');
    expect(workflow).toContain("wasm32-unknown-unknown");
  });

  it("release guide lists the versioned core tarball, VSIX, and native CLI binary", () => {
    const guide = fs.readFileSync(RELEASE_GUIDE, "utf-8");
    expect(guide).toContain("# Release Instructions");
    expect(guide).toContain("git tag vX.Y.Z");
    expect(guide).toContain("Publish the GitHub Release");
    expect(guide).toContain("gitreqd-core-X.Y.Z.tgz");
    expect(guide).toContain("gitreqd-vscode-X.Y.Z.vsix");
    expect(guide).toContain("gitreqd-linux-x86_64");
    expect(guide).not.toContain("gitreqd-X.Y.Z.tgz");
  });
});
