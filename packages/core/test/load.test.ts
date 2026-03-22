/**
 * Tests for loadRequirements. GRD-SYS-004: hierarchy from directory structure.
 * GRD-SYS-005: parameters parsed from YAML.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT_MARKER } from "../src/discovery";
import { REQUIREMENT_FILE_EXTENSION } from "../src/requirement-files";
import { loadRequirements } from "../src/load";
import { parseRequirementContent } from "../src/parse";

function makeTempProject(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-load-"));
  const projectRoot = path.join(tmpDir, "project");
  fs.mkdirSync(projectRoot);
  return projectRoot;
}

describe("loadRequirements", () => {
  function makeTempProjectInDescribe(): string {
    return makeTempProject();
  }

  describe("GRD-SYS-004: project hierarchy from directory structure", () => {
    it("sets categoryPath from path under requirement_dir", async () => {
      const projectRoot = makeTempProjectInDescribe();
      const reqsDir = path.join(projectRoot, "requirements");
      const htmlDir = path.join(reqsDir, "html-report");
      const sysDir = path.join(reqsDir, "sys");
      fs.mkdirSync(htmlDir, { recursive: true });
      fs.mkdirSync(sysDir, { recursive: true });

      fs.writeFileSync(
        path.join(projectRoot, ROOT_MARKER),
        "requirement_dirs:\n  - requirements\n",
        "utf-8"
      );
      fs.writeFileSync(
        path.join(htmlDir, `GRD-HTML-001${REQUIREMENT_FILE_EXTENSION}`),
        "id: GRD-HTML-001\ntitle: HTML report\ndescription: Full report\n",
        "utf-8"
      );
      fs.writeFileSync(
        path.join(sysDir, `GRD-SYS-001${REQUIREMENT_FILE_EXTENSION}`),
        "id: GRD-SYS-001\ntitle: Core\ndescription: Core behavior\n",
        "utf-8"
      );

      const { requirements, errors } = await loadRequirements(projectRoot, projectRoot);

      expect(errors).toHaveLength(0);
      expect(requirements).toHaveLength(2);
      const byId = new Map(requirements.map((r) => [r.id, r]));
      expect(byId.get("GRD-HTML-001")?.categoryPath).toEqual(["html-report"]);
      expect(byId.get("GRD-SYS-001")?.categoryPath).toEqual(["sys"]);
    });

    it("sets empty categoryPath when requirement is directly under requirement_dir", async () => {
      const projectRoot = makeTempProjectInDescribe();
      const reqsDir = path.join(projectRoot, "reqs");
      fs.mkdirSync(reqsDir);

      fs.writeFileSync(
        path.join(projectRoot, ROOT_MARKER),
        "requirement_dirs:\n  - reqs\n",
        "utf-8"
      );
      fs.writeFileSync(
        path.join(reqsDir, `GRD-TOP-001${REQUIREMENT_FILE_EXTENSION}`),
        "id: GRD-TOP-001\ntitle: Top\ndescription: At top\n",
        "utf-8"
      );

      const { requirements, errors } = await loadRequirements(projectRoot, projectRoot);

      expect(errors).toHaveLength(0);
      expect(requirements).toHaveLength(1);
      expect(requirements[0]!.categoryPath).toEqual([]);
    });

    it("sets nested categoryPath for deep directory structure", async () => {
      const projectRoot = makeTempProjectInDescribe();
      const deepDir = path.join(projectRoot, "requirements", "cli", "sub");
      fs.mkdirSync(deepDir, { recursive: true });

      fs.writeFileSync(
        path.join(projectRoot, ROOT_MARKER),
        "requirement_dirs:\n  - requirements\n",
        "utf-8"
      );
      fs.writeFileSync(
        path.join(deepDir, `GRD-CLI-SUB-001${REQUIREMENT_FILE_EXTENSION}`),
        "id: GRD-CLI-SUB-001\ntitle: Nested\ndescription: Nested req\n",
        "utf-8"
      );

      const { requirements, errors } = await loadRequirements(projectRoot, projectRoot);

      expect(errors).toHaveLength(0);
      expect(requirements).toHaveLength(1);
      expect(requirements[0]!.categoryPath).toEqual(["cli", "sub"]);
    });
  });
});

describe("GRD-SYS-005: parameters in requirement YAML", () => {
  it("parses parameters (string, number, boolean) from content", () => {
    const content = `
id: GRD-PARAM-001
title: Param requirement
description: Limit is {{ :limit }}.
parameters:
  limit: 100
  name: foo
  enabled: true
`;
    const result = parseRequirementContent(content, `/req${REQUIREMENT_FILE_EXTENSION}`);
    expect("error" in result).toBe(false);
    const req = "requirement" in result ? result.requirement : null;
    expect(req?.parameters).toEqual({ limit: 100, name: "foo", enabled: true });
    expect(req?.description).toContain("{{ :limit }}");
  });

  it("loads requirement file with parameters from disk", async () => {
    const projectRoot = makeTempProject();
    const reqsDir = path.join(projectRoot, "requirements");
    fs.mkdirSync(reqsDir, { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, ROOT_MARKER),
      "requirement_dirs:\n  - requirements\n",
      "utf-8"
    );
    fs.writeFileSync(
      path.join(reqsDir, `GRD-SYS-005${REQUIREMENT_FILE_EXTENSION}`),
      `id: GRD-SYS-005
title: Requirement Parameterization
description: Use {{ :syntax }} in text.
parameters:
  syntax: "{{ :param }}"
`,
      "utf-8"
    );
    const { requirements, errors } = await loadRequirements(projectRoot, projectRoot);
    expect(errors).toHaveLength(0);
    expect(requirements).toHaveLength(1);
    expect(requirements[0]!.parameters).toEqual({ syntax: "{{ :param }}" });
  });
});
