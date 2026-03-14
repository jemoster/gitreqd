import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { discoverRequirementPaths, getOllamaConfig } from "../src/discovery";

describe("GRD-SYS-007: root.gitreqd contents", () => {
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

    const fileA = path.join(dirA, "one.yml");
    const fileB = path.join(dirB, "two.yaml");
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
      path.join(projectRoot, "root.gitreqd"),
      ["requirement_dirs:", "  - reqs-a", "  - reqs-b"].join("\n"),
      "utf-8"
    );

    const paths = await discoverRequirementPaths(projectRoot);

    expect(paths).toEqual(expect.arrayContaining([fileA, fileB]));
    expect(paths).toHaveLength(2);
  });

  it("throws if requirement_dirs contains duplicate directories after resolving paths", async () => {
    const projectRoot = makeTempProject();

    fs.writeFileSync(
      path.join(projectRoot, "root.gitreqd"),
      ["requirement_dirs:", "  - reqs", "  - ./reqs"].join("\n"),
      "utf-8"
    );

    await expect(discoverRequirementPaths(projectRoot)).rejects.toThrow(
      /duplicate "requirement_dirs" entry after resolving paths/
    );
  });

  describe("GRD-GIT-002: ollama config", () => {
    it("returns ollama base_url and model when present in root.gitreqd", () => {
      const projectRoot = makeTempProject();
      fs.writeFileSync(
        path.join(projectRoot, "root.gitreqd"),
        ["requirement_dirs:", "  - reqs", "ollama:", "  base_url: \"http://ollama:11434\"", "  model: llama4:scout"].join("\n"),
        "utf-8"
      );
      const config = getOllamaConfig(projectRoot);
      expect(config).toEqual({ base_url: "http://ollama:11434", model: "llama4:scout" });
    });

    it("returns null when ollama key is missing", () => {
      const projectRoot = makeTempProject();
      fs.writeFileSync(path.join(projectRoot, "root.gitreqd"), "requirement_dirs:\n  - reqs\n", "utf-8");
      expect(getOllamaConfig(projectRoot)).toBeNull();
    });

    it("returns null when ollama.model is missing", () => {
      const projectRoot = makeTempProject();
      fs.writeFileSync(
        path.join(projectRoot, "root.gitreqd"),
        "requirement_dirs:\n  - reqs\nollama:\n  base_url: http://localhost:11434\n",
        "utf-8"
      );
      expect(getOllamaConfig(projectRoot)).toBeNull();
    });
  });
});

