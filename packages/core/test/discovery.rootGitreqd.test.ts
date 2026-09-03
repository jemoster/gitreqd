import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  discoverRequirementPaths,
  getRequirementDirs,
  ROOT_MARKER,
} from "../src/discovery";

describe("GRD-SYS-007: gitreqd.yaml contents", () => {
  function makeTempProject(): string {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-grd-cli-004-"));
    const projectRoot = path.join(tmpDir, "project");
    fs.mkdirSync(projectRoot);
    return projectRoot;
  }

  it("uses requirement_dirs entries as relative directories to find requirement files", async () => {
    const projectRoot = makeTempProject();

    const dirA = path.join(projectRoot, "reqs-a");
    const dirB = path.join(projectRoot, "reqs-b");
    fs.mkdirSync(dirA);
    fs.mkdirSync(dirB);

    const fileA = path.join(dirA, "one.req.yml");
    const fileB = path.join(dirB, "two.req.yml");
    fs.writeFileSync(
      fileA,
      [
        "id: TEST-A",
        "title: Test requirement A",
        "require: The system shall test.",
        "refinement: A test requirement in reqs-a",
        "",
      ].join("\n"),
      "utf-8"
    );
    fs.writeFileSync(
      fileB,
      [
        "id: TEST-B",
        "title: Test requirement B",
        "require: The system shall test.",
        "refinement: A test requirement in reqs-b",
        "",
      ].join("\n"),
      "utf-8"
    );

    fs.writeFileSync(
      path.join(projectRoot, ROOT_MARKER),
      ["requirement_dirs:", "  - reqs-a", "  - reqs-b"].join("\n"),
      "utf-8"
    );

    const paths = await discoverRequirementPaths(projectRoot);

    expect(paths).toEqual(expect.arrayContaining([fileA, fileB]));
    expect(paths).toHaveLength(2);
  });

  it("treats requirement_dirs entry . as the project root and all subdirectories (GRD-SYS-007)", async () => {
    const projectRoot = makeTempProject();
    const nested = path.join(projectRoot, "deep", "nested");
    fs.mkdirSync(nested, { recursive: true });
    const rootFile = path.join(projectRoot, "at-root.req.yml");
    const nestedFile = path.join(nested, "deep.req.yml");
    fs.writeFileSync(rootFile, "id: ROOT\ntitle: t\nrequire: The system shall test.\nrefinement: x\n", "utf-8");
    fs.writeFileSync(nestedFile, "id: DEEP\ntitle: t\nrequire: The system shall test.\nrefinement: x\n", "utf-8");
    fs.writeFileSync(
      path.join(projectRoot, ROOT_MARKER),
      ["requirement_dirs:", "  - ."].join("\n"),
      "utf-8"
    );
    const paths = await discoverRequirementPaths(projectRoot);
    expect(paths).toEqual(expect.arrayContaining([rootFile, nestedFile]));
    expect(paths).toHaveLength(2);
  });

  it("discovers .req.yaml files as well as .req.yml (GRD-SYS-007)", async () => {
    const projectRoot = makeTempProject();
    const dirA = path.join(projectRoot, "reqs");
    fs.mkdirSync(dirA);
    const fileYml = path.join(dirA, "A.req.yml");
    const fileYaml = path.join(dirA, "B.req.yaml");
    fs.writeFileSync(fileYml, "id: A\ntitle: A\nrequire: The system shall test.\nrefinement: x\n", "utf-8");
    fs.writeFileSync(fileYaml, "id: B\ntitle: B\nrequire: The system shall test.\nrefinement: y\n", "utf-8");
    fs.writeFileSync(
      path.join(projectRoot, ROOT_MARKER),
      "requirement_dirs:\n  - reqs\n",
      "utf-8"
    );
    const paths = await discoverRequirementPaths(projectRoot);
    expect(paths).toEqual(expect.arrayContaining([fileYml, fileYaml]));
    expect(paths).toHaveLength(2);
  });

  it("throws if the top-level document is not a mapping", () => {
    const projectRoot = makeTempProject();
    fs.writeFileSync(path.join(projectRoot, ROOT_MARKER), "- not a mapping\n", "utf-8");
    expect(() => getRequirementDirs(projectRoot)).toThrow(/expected a mapping at top level/);
  });

  it("throws if requirement_dirs is not a sequence", () => {
    const projectRoot = makeTempProject();
    fs.writeFileSync(path.join(projectRoot, ROOT_MARKER), "requirement_dirs: reqs\n", "utf-8");
    expect(() => getRequirementDirs(projectRoot)).toThrow(/"requirement_dirs" must be a sequence/);
  });

  it("throws if requirement_dirs contains duplicate directories after resolving paths", async () => {
    const projectRoot = makeTempProject();

    fs.writeFileSync(
      path.join(projectRoot, ROOT_MARKER),
      ["requirement_dirs:", "  - reqs", "  - ./reqs"].join("\n"),
      "utf-8"
    );

    await expect(discoverRequirementPaths(projectRoot)).rejects.toThrow(
      /duplicate "requirement_dirs" entry after resolving paths/
    );
  });
});

