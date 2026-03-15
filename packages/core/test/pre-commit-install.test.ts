/**
 * GRD-GIT-003: Pre-commit hook installation script and hook content.
 * Verifies the install script installs the hook into .git/hooks and that the hook
 * uses repo root as project dir unless GITREQD_PROJECT_DIR is set and calls gitreqd validate.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const INSTALL_SCRIPT = path.join(REPO_ROOT, "scripts/install-pre-commit.sh");
const HOOK_SOURCE = path.join(REPO_ROOT, "scripts/pre-commit");

describe("GRD-GIT-003: Pre-commit hook and installation script", () => {
  function makeTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-grd-git-003-"));
  }

  it("install script installs pre-commit hook into .git/hooks when repo path is given", () => {
    const tmpDir = makeTempDir();
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });

    execSync(`bash "${INSTALL_SCRIPT}" "${tmpDir}"`, { stdio: "pipe" });

    const hookPath = path.join(tmpDir, ".git", "hooks", "pre-commit");
    expect(fs.existsSync(hookPath)).toBe(true);
    const mode = fs.statSync(hookPath).mode;
    expect((mode & 0o111) !== 0).toBe(true); // executable
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("gitreqd validate");
    expect(content).toContain("GITREQD_PROJECT_DIR");
    expect(content).toContain("--project-dir");
  });

  it("install script uses cwd repo when no repo path is given", () => {
    const tmpDir = makeTempDir();
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });

    execSync(`bash "${INSTALL_SCRIPT}"`, { cwd: tmpDir, stdio: "pipe" });

    const hookPath = path.join(tmpDir, ".git", "hooks", "pre-commit");
    expect(fs.existsSync(hookPath)).toBe(true);
  });

  it("pre-commit hook source uses repo root as project dir unless GITREQD_PROJECT_DIR set", () => {
    const content = fs.readFileSync(HOOK_SOURCE, "utf-8");
    expect(content).toContain('git rev-parse --show-toplevel');
    expect(content).toContain("GITREQD_PROJECT_DIR");
    expect(content).toContain("GIT_ROOT");
    expect(content).toContain("gitreqd validate --project-dir");
  });
});
