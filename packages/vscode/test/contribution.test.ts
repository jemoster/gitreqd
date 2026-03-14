/**
 * GRD-VSC-003: Requirement editor preview — contribution tests.
 * Asserts that the extension contributes the Preview editor title action
 * for YAML files and the openPreview command.
 *
 * Preview uses core's generateSingleRequirementHtml (same as full report), so description
 * and rationale are rendered as Markdown per GRD-HTML-004; see packages/core/test/html.test.ts.
 */
import * as path from "node:path";
import * as fs from "node:fs";

const packagePath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8")) as {
  contributes?: {
    commands?: Array<{ command: string; title: string; category?: string; icon?: string }>;
    menus?: Record<string, Array<{ command: string; when?: string; group?: string }>>;
    yamlValidation?: Array<{ fileMatch?: string | string[]; url?: string }>;
  };
};

describe("GRD-VSC-003 requirement preview contributions", () => {
  it("contributes openPreview command with Gitreqd category and icon", () => {
    const commands = pkg.contributes?.commands ?? [];
    const preview = commands.find((c) => c.command === "gitreqd.requirement.openPreview");
    expect(preview).toBeDefined();
    expect(preview!.title).toContain("Preview");
    expect(preview!.category).toBe("Gitreqd");
    expect(preview!.icon).toBe("$(open-preview)");
  });

  it("contributes editor/title menu so Preview button is shown for YAML", () => {
    const editorTitle = pkg.contributes?.menus?.["editor/title"] ?? [];
    const previewEntry = editorTitle.find(
      (m) => m.command === "gitreqd.requirement.openPreview"
    );
    expect(previewEntry).toBeDefined();
    expect(previewEntry!.when).toBe("editorLangId == yaml");
  });
});

describe("GRD-VSC-004 YAML schema for requirement files", () => {
  it("contributes yamlValidation with schema URL and fileMatch for requirement files", () => {
    const validations = pkg.contributes?.yamlValidation ?? [];
    expect(validations.length).toBeGreaterThan(0);
    const requirementSchema = validations.find(
      (v) => v.url === "./schemas/requirement.json"
    );
    expect(requirementSchema).toBeDefined();
    const fileMatch = requirementSchema!.fileMatch;
    expect(Array.isArray(fileMatch) ? fileMatch : [fileMatch]).toContain(
      "**/requirements/**/*.yml"
    );
    expect(Array.isArray(fileMatch) ? fileMatch : [fileMatch]).toContain(
      "**/requirements/**/*.yaml"
    );
  });

  it("schema file exists and describes requirement structure (id, title, description, attributes, links)", () => {
    const schemaPath = path.join(__dirname, "..", "schemas", "requirement.json");
    expect(fs.existsSync(schemaPath)).toBe(true);
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8")) as {
      type?: string;
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(schema.type).toBe("object");
    expect(schema.required).toContain("id");
    expect(schema.required).toContain("title");
    expect(schema.properties).toBeDefined();
    expect(schema.properties!.id).toBeDefined();
    expect(schema.properties!.title).toBeDefined();
    expect(schema.properties!.description).toBeDefined();
    expect(schema.properties!.attributes).toBeDefined();
    expect(schema.properties!.links).toBeDefined();
  });
});

describe("GRD-VSC-005 Add new requirement from explorer context menu", () => {
  it("contributes gitreqd.requirement.new command with Gitreqd category", () => {
    const commands = pkg.contributes?.commands ?? [];
    const newReq = commands.find((c) => c.command === "gitreqd.requirement.new");
    expect(newReq).toBeDefined();
    expect(newReq!.title).toContain("Add New Requirement");
    expect(newReq!.category).toBe("Gitreqd");
  });

  it("contributes explorer/context menu for the new requirement command", () => {
    const explorerContext = pkg.contributes?.menus?.["explorer/context"] ?? [];
    const newReqEntry = explorerContext.find(
      (m) => m.command === "gitreqd.requirement.new"
    );
    expect(newReqEntry).toBeDefined();
    expect(newReqEntry!.group).toBe("Gitreqd");
  });

  it("newRequirementYamlTemplate produces YAML matching requirement schema (id, title, description, attributes, links)", async () => {
    const { newRequirementYamlTemplate } = await import(
      "../src/new-requirement-template.js"
    );
    const id = "GRD-TEST-001";
    const yaml = newRequirementYamlTemplate(id);
    expect(yaml).toContain(`id: ${id}`);
    expect(yaml).toContain("title:");
    expect(yaml).toContain("description:");
    expect(yaml).toContain("attributes:");
    expect(yaml).toContain("links:");
    const { parse } = await import("yaml");
    const parsed = parse(yaml) as Record<string, unknown>;
    expect(parsed).toBeDefined();
    expect(parsed.id).toBe(id);
    expect(typeof parsed.title).toBe("string");
    expect("description" in parsed).toBe(true);
    expect(parsed.attributes).toBeDefined();
    expect(Array.isArray(parsed.links)).toBe(true);
  });
});
