/**
 * GRD-CLI-009: GitHub release workflow publishes a native Linux x86_64 gitreqd CLI binary.
 */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const CLI_RELEASE_WORKFLOW = path.join(REPO_ROOT, ".github", "workflows", "release-cli.yml");
const TEST_WORKFLOW = path.join(REPO_ROOT, ".github", "workflows", "test.yml");
const PACKAGE_SCRIPT = path.join(REPO_ROOT, "scripts", "package-native-cli.sh");
const RELEASE_GUIDE = path.join(REPO_ROOT, "release.md");

describe("GRD-CLI-009: native CLI binary release artifact", () => {
  it("packaging script builds a Linux x86_64 gitreqd binary into release/", () => {
    const script = fs.readFileSync(PACKAGE_SCRIPT, "utf-8");
    expect(script).toContain("cargo build --release -p gitreqd");
    expect(script).toContain("x86_64-unknown-linux-gnu");
    expect(script).toContain("gitreqd-linux-x86_64");
    expect(script).toContain("RELEASE_DIR");
  });

  it("release workflow uploads the native binary to GitHub Releases", () => {
    const workflow = fs.readFileSync(CLI_RELEASE_WORKFLOW, "utf-8");
    expect(workflow).toContain("release:");
    expect(workflow).toContain("types: [published]");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("contents: write");
    expect(workflow).toContain("bash ./scripts/package-native-cli.sh");
    expect(workflow).toContain("release/gitreqd-linux-x86_64");
    expect(workflow).toContain('gh release upload "${{ github.event.release.tag_name }}"');
    expect(workflow).toContain("if: github.event_name == 'release'");
    expect(workflow).toContain("if: github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("actions/upload-artifact@v4");
  });

  it("PR cargo-test job uploads the native binary as a downloadable workflow artifact", () => {
    const workflow = fs.readFileSync(TEST_WORKFLOW, "utf-8");
    expect(workflow).toContain("bash ./scripts/package-native-cli.sh");
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain("name: gitreqd-linux-x86_64");
    expect(workflow).toContain("path: release/gitreqd-linux-x86_64");
  });

  it("release guide mentions the Linux x86_64 native CLI binary asset and how to test packaging", () => {
    const guide = fs.readFileSync(RELEASE_GUIDE, "utf-8");
    expect(guide).toContain("gitreqd-linux-x86_64");
    expect(guide).toContain("gh run download");
    expect(guide).toContain("workflow_dispatch");
  });
});
