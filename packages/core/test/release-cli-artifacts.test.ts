/**
 * GRD-CLI-007: GitHub release workflow publishes CLI install artifacts for direct npm source installs.
 */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const CLI_RELEASE_WORKFLOW = path.join(REPO_ROOT, ".github", "workflows", "release-cli.yml");
const RELEASE_GUIDE = path.join(REPO_ROOT, "release.md");

describe("GRD-CLI-007: CLI release artifacts and release guide", () => {
  it("release workflow packages CLI tarballs and uploads them to GitHub Releases", () => {
    const workflow = fs.readFileSync(CLI_RELEASE_WORKFLOW, "utf-8");
    expect(workflow).toContain("release:");
    expect(workflow).toContain("types: [published]");
    expect(workflow).toContain("contents: write");
    expect(workflow).toContain("bash ./scripts/package.sh");
    expect(workflow).toContain('tgz_files=(release/*.tgz)');
    expect(workflow).toContain('gh release upload "${{ github.event.release.tag_name }}"');
  });

  it("standalone release guide includes tagging and install verification steps", () => {
    const guide = fs.readFileSync(RELEASE_GUIDE, "utf-8");
    expect(guide).toContain("# Release Instructions");
    expect(guide).toContain("git tag vX.Y.Z");
    expect(guide).toContain("Publish the GitHub Release");
    expect(guide).toContain('npm install -g "https://github.com/<org>/<repo>/releases/download/vX.Y.Z/<artifact>.tgz"');
  });
});
