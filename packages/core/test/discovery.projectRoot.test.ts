import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  discoverProjectRootCandidates,
  discoverProjectRoot,
  ROOT_MARKER,
} from "../src/discovery";

describe("GRD-CLI-003: CLI project root discovery", () => {
  function makeTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-grd-cli-003-"));
  }

  it("returns empty array when no root.gitreqd is found walking up from start dir", async () => {
    const tmpDir = makeTempDir();
    const subDir = path.join(tmpDir, "a", "b", "c");
    fs.mkdirSync(subDir, { recursive: true });

    const candidates = await discoverProjectRootCandidates(subDir);

    expect(candidates).toEqual([]);
  });

  it("finds project root when start dir is the directory containing root.gitreqd", async () => {
    const tmpDir = makeTempDir();
    fs.writeFileSync(path.join(tmpDir, ROOT_MARKER), "requirement_dirs:\n  - reqs\n", "utf-8");

    const candidates = await discoverProjectRootCandidates(tmpDir);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toBe(path.resolve(tmpDir));
  });

  it("finds project root when start dir is below the directory containing root.gitreqd", async () => {
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

  it("stops at the first root.gitreqd found when walking up (nearest root wins)", async () => {
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

  it("discoverProjectRoot returns the root path when root.gitreqd is found", async () => {
    const tmpDir = makeTempDir();
    fs.writeFileSync(path.join(tmpDir, ROOT_MARKER), "requirement_dirs:\n  - x\n", "utf-8");

    const root = await discoverProjectRoot(tmpDir);

    expect(root).toBe(path.resolve(tmpDir));
  });
});
