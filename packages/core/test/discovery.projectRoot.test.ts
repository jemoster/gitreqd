import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  discoverProjectRootCandidates,
  discoverProjectRoot,
  ROOT_MARKER,
  ROOT_MARKER_FILENAMES,
} from "../src/discovery";

describe("GRD-CLI-003: CLI project root discovery", () => {
  function makeTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-grd-cli-003-"));
  }

  it("returns empty array when no gitreqd.yaml is found walking up from start dir", async () => {
    const tmpDir = makeTempDir();
    const subDir = path.join(tmpDir, "a", "b", "c");
    fs.mkdirSync(subDir, { recursive: true });

    const candidates = await discoverProjectRootCandidates(subDir);

    expect(candidates).toEqual([]);
  });

  it("finds project root when start dir is the directory containing gitreqd.yaml", async () => {
    const tmpDir = makeTempDir();
    fs.writeFileSync(path.join(tmpDir, ROOT_MARKER), "requirement_dirs:\n  - reqs\n", "utf-8");

    const candidates = await discoverProjectRootCandidates(tmpDir);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toBe(path.resolve(tmpDir));
  });

  it("finds project root when start dir is below the directory containing gitreqd.yaml", async () => {
    const tmpDir = makeTempDir();
    const projectRoot = path.join(tmpDir, "project");
    const subDir = path.join(projectRoot, "src", "deep");
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, ROOT_MARKER),
      "requirement_dirs:\n  - requirements\n",
      "utf-8"
    );

    const candidates = await discoverProjectRootCandidates(subDir);

    expect(candidates).toHaveLength(1);
    expect(candidates![0]).toBe(path.resolve(projectRoot));
  });

  it("stops at the first gitreqd.yaml found when walking up (nearest root wins)", async () => {
    const tmpDir = makeTempDir();
    const outerRoot = path.join(tmpDir, "outer");
    const innerRoot = path.join(outerRoot, "inner");
    const startDir = path.join(innerRoot, "leaf");
    fs.mkdirSync(startDir, { recursive: true });
    fs.writeFileSync(
      path.join(outerRoot, ROOT_MARKER),
      "requirement_dirs:\n  - a\n",
      "utf-8"
    );
    fs.writeFileSync(
      path.join(innerRoot, ROOT_MARKER),
      "requirement_dirs:\n  - b\n",
      "utf-8"
    );

    const candidates = await discoverProjectRootCandidates(startDir);

    expect(candidates).toHaveLength(1);
    expect(candidates![0]).toBe(path.resolve(innerRoot));
  });

  it("discoverProjectRoot returns null when no root is found", async () => {
    const tmpDir = makeTempDir();
    const subDir = path.join(tmpDir, "a", "b");
    fs.mkdirSync(subDir, { recursive: true });

    const root = await discoverProjectRoot(subDir);

    expect(root).toBeNull();
  });

  it("discoverProjectRoot returns the root path when gitreqd.yaml is found", async () => {
    const tmpDir = makeTempDir();
    fs.writeFileSync(path.join(tmpDir, ROOT_MARKER), "requirement_dirs:\n  - x\n", "utf-8");

    const root = await discoverProjectRoot(tmpDir);

    expect(root).toBe(path.resolve(tmpDir));
  });

  it("finds project root when gitreqd.yml is present (GRD-SYS-007)", async () => {
    const tmpDir = makeTempDir();
    const ymlName = ROOT_MARKER_FILENAMES[1]!;
    fs.writeFileSync(path.join(tmpDir, ymlName), "requirement_dirs:\n  - reqs\n", "utf-8");

    const candidates = await discoverProjectRootCandidates(tmpDir);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toBe(path.resolve(tmpDir));
  });
});
