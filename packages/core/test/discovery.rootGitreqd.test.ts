import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  discoverRequirementPaths,
  getRequirementDirs,
  ROOT_MARKER,
  ROOT_MARKER_FILENAMES,
} from "../src/discovery";
import { parseLlmConfig } from "../src/llm-config";

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
        "description: A test requirement in reqs-a",
        "",
      ].join("\n"),
      "utf-8"
    );
    fs.writeFileSync(
      fileB,
      [
        "id: TEST-B",
        "title: Test requirement B",
        "description: A test requirement in reqs-b",
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

  it("discovers .req.yaml files as well as .req.yml (GRD-SYS-007)", async () => {
    const projectRoot = makeTempProject();
    const dirA = path.join(projectRoot, "reqs");
    fs.mkdirSync(dirA);
    const fileYml = path.join(dirA, "A.req.yml");
    const fileYaml = path.join(dirA, "B.req.yaml");
    fs.writeFileSync(fileYml, "id: A\ntitle: A\ndescription: x\n", "utf-8");
    fs.writeFileSync(fileYaml, "id: B\ntitle: B\ndescription: y\n", "utf-8");
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

  describe("GRD-SYS-012 / GRD-SYS-014: llm config in root marker", () => {
    it("parses ollama base_url and model when present in gitreqd.yaml", () => {
      const projectRoot = makeTempProject();
      fs.writeFileSync(
        path.join(projectRoot, ROOT_MARKER),
        [
          "requirement_dirs:",
          "  - reqs",
          "llm:",
          "  provider: ollama",
          "  base_url: \"http://ollama:11434\"",
          "  model: llama4:scout",
        ].join("\n"),
        "utf-8"
      );
      const r = parseLlmConfig(projectRoot);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.config).toEqual({
          provider: "ollama",
          base_url: "http://ollama:11434",
          model: "llama4:scout",
        });
      }
    });

    it("fails when llm key is missing", () => {
      const projectRoot = makeTempProject();
      fs.writeFileSync(path.join(projectRoot, ROOT_MARKER), "requirement_dirs:\n  - reqs\n", "utf-8");
      const r = parseLlmConfig(projectRoot);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/Missing "llm"/);
    });

    it("fails when ollama model is missing", () => {
      const projectRoot = makeTempProject();
      fs.writeFileSync(
        path.join(projectRoot, ROOT_MARKER),
        "requirement_dirs:\n  - reqs\nllm:\n  provider: ollama\n  base_url: http://localhost:11434\n",
        "utf-8"
      );
      const r = parseLlmConfig(projectRoot);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/llm\.model/);
    });

    it("reads config from gitreqd.yml when that is the project marker (GRD-SYS-007)", () => {
      const projectRoot = makeTempProject();
      const ymlMarker = ROOT_MARKER_FILENAMES[1]!;
      fs.writeFileSync(
        path.join(projectRoot, ymlMarker),
        ["requirement_dirs:", "  - reqs", "llm:", "  provider: ollama", "  base_url: \"http://x:11434\"", "  model: m"].join("\n"),
        "utf-8"
      );
      const r = parseLlmConfig(projectRoot);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.config).toEqual({ provider: "ollama", base_url: "http://x:11434", model: "m" });
      }
    });
  });
});

