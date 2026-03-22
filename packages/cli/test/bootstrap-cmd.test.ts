/**
 * GRD-CLI-004: Tests for CLI bootstrap command.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runBootstrap } from "../src/bootstrap-cmd";
import { ROOT_MARKER, ROOT_MARKER_FILENAMES } from "@gitreqd/core";

describe("GRD-CLI-004: CLI bootstrap", () => {
  function makeTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-bootstrap-"));
  }

  it("creates gitreqd.yaml and requirements folder in empty directory", async () => {
    const tmpDir = makeTempDir();
    const result = await runBootstrap(tmpDir);

    expect(result.success).toBe(true);
    expect(result.created).toContain(path.join(tmpDir, ROOT_MARKER));
    expect(result.created).toContain(path.join(tmpDir, "requirements"));

    const rootPath = path.join(tmpDir, ROOT_MARKER);
    expect(fs.existsSync(rootPath)).toBe(true);
    const content = fs.readFileSync(rootPath, "utf-8");
    expect(content).toContain("requirement_dirs:");
    expect(content).toContain("- requirements");

    expect(fs.existsSync(path.join(tmpDir, "requirements"))).toBe(true);
    expect(fs.statSync(path.join(tmpDir, "requirements")).isDirectory()).toBe(true);
  });

  it("fails when gitreqd.yaml already exists and force is false", async () => {
    const tmpDir = makeTempDir();
    fs.writeFileSync(path.join(tmpDir, ROOT_MARKER), "requirement_dirs:\n  - x\n", "utf-8");

    const result = await runBootstrap(tmpDir);

    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
    expect(result.error).toContain("--force");
  });

  it("fails when gitreqd.yml already exists and force is false", async () => {
    const tmpDir = makeTempDir();
    const alt = ROOT_MARKER_FILENAMES[1]!;
    fs.writeFileSync(path.join(tmpDir, alt), "requirement_dirs:\n  - x\n", "utf-8");

    const result = await runBootstrap(tmpDir);

    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
    expect(result.error).toContain("--force");
  });

  it("overwrites gitreqd.yaml when force is true", async () => {
    const tmpDir = makeTempDir();
    const rootPath = path.join(tmpDir, ROOT_MARKER);
    fs.writeFileSync(rootPath, "requirement_dirs:\n  - other\n", "utf-8");

    const result = await runBootstrap(tmpDir, { force: true });

    expect(result.success).toBe(true);
    const content = fs.readFileSync(rootPath, "utf-8");
    expect(content).toContain("- requirements");
  });

  it("does not fail when requirements folder already exists", async () => {
    const tmpDir = makeTempDir();
    const reqDir = path.join(tmpDir, "requirements");
    fs.mkdirSync(reqDir, { recursive: true });

    const result = await runBootstrap(tmpDir);

    expect(result.success).toBe(true);
    expect(fs.existsSync(reqDir)).toBe(true);
  });

  it("fails when target path exists but is not a directory", async () => {
    const tmpDir = makeTempDir();
    const filePath = path.join(tmpDir, "file");
    fs.writeFileSync(filePath, "", "utf-8");

    const result = await runBootstrap(filePath);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Not a directory");
  });

  it("fails when target directory does not exist", async () => {
    const tmpDir = makeTempDir();
    const missing = path.join(tmpDir, "missing");

    const result = await runBootstrap(missing);

    expect(result.success).toBe(false);
    expect(result.error).toContain("does not exist");
  });

  it("with cursorRules and templateRulesDir copies .cursor/rules into target", async () => {
    const tmpDir = makeTempDir();
    const templateRulesDir = path.join(path.dirname(path.dirname(__dirname)), "templates", ".cursor", "rules");
    const result = await runBootstrap(tmpDir, {
      cursorRules: true,
      templateRulesDir: fs.existsSync(templateRulesDir) ? templateRulesDir : undefined,
    });

    expect(result.success).toBe(true);
    const cursorRulesDir = path.join(tmpDir, ".cursor", "rules");
    if (fs.existsSync(templateRulesDir)) {
      expect(fs.existsSync(cursorRulesDir)).toBe(true);
      const rulesFile = path.join(cursorRulesDir, "requirements.md");
      expect(fs.existsSync(rulesFile)).toBe(true);
    }
  });
});
