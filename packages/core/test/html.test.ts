/**
 * Tests for HTML generation. GRD-VSC-003: single-requirement preview shares
 * base structure and styling with the full requirements report.
 */
import {
  generateFullHtml,
  generateSingleRequirementHtml,
} from "../src/html";
import { REQUIREMENT_FILE_EXTENSION } from "../src/requirement-files";
import type { RequirementWithSource } from "../src/types";

function req(
  id: string,
  title: string,
  overrides?: Partial<RequirementWithSource>
): RequirementWithSource {
  return {
    id,
    title,
    description: "Description text",
    sourcePath: `/project/${id}${REQUIREMENT_FILE_EXTENSION}`,
    ...overrides,
  };
}

describe("generateFullHtml", () => {
  it("produces full report with index and details", () => {
    const html = generateFullHtml([
      req("GRD-A-001", "First"),
      req("GRD-A-002", "Second"),
    ]);
    expect(html).toContain("<h1>Requirements</h1>");
    expect(html).toContain("Total: 2");
    expect(html).toContain("<h2>Index</h2>");
    expect(html).toContain("<h2>Details</h2>");
    expect(html).toContain('href="#GRD-A-001"');
    expect(html).toContain('id="GRD-A-001"');
    expect(html).toContain("First");
    expect(html).toContain("Second");
    expect(html).toContain("class=\"requirement-detail\"");
    expect(html).toContain("class=\"meta\"");
    expect(html).toContain("class=\"source\"");
    expect(html).toContain("class=\"description\"");
  });

  describe("GRD-HTML-001", () => {
    it("includes all attributes from the requirements file", () => {
      const r = req("GRD-HTML-001", "HTML report", {
        attributes: {
          status: "active",
          rationale: "HTML output is easily consumed and distributed.",
        },
      });
      const html = generateFullHtml([r]);
      expect(html).toContain("Status");
      expect(html).toContain("active");
      expect(html).toContain("Rationale");
      expect(html).toContain("HTML output is easily consumed");
    });

    it("includes all link types from the requirements file", () => {
      const r = req("GRD-X-001", "Title", {
        links: [
          { satisfies: "GRD-X-000" },
          { satisfies: "GRD-X-002" },
        ],
      });
      const html = generateFullHtml([r]);
      expect(html).toContain('href="#GRD-X-000"');
      expect(html).toContain('href="#GRD-X-002"');
      expect(html).toContain("Satisfies");
    });

    it("represents full requirement: id, title, description, attributes, links, source", () => {
      const r = req("GRD-FULL-001", "Full requirement", {
        description: "Full description text",
        attributes: { status: "draft", rationale: "Test rationale." },
        links: [{ satisfies: "GRD-OTHER" }],
        sourcePath: "/project/reqs/GRD-FULL-001.req.yml",
      });
      const html = generateFullHtml([r]);
      expect(html).toContain("GRD-FULL-001");
      expect(html).toContain("Full requirement");
      expect(html).toContain("Full description text");
      expect(html).toContain("Status");
      expect(html).toContain("draft");
      expect(html).toContain("Rationale");
      expect(html).toContain("Test rationale");
      expect(html).toContain("Satisfies");
      expect(html).toContain('href="#GRD-OTHER"');
      expect(html).toContain("/project/reqs/GRD-FULL-001.req.yml");
    });

    it("displays parameters (name and value) when requirement defines a parameters map", () => {
      const r = req("GRD-PARAMS-001", "Parameterized requirement", {
        parameters: { limit: 42, name: "maxItems", enabled: true },
        sourcePath: "/project/GRD-PARAMS-001.req.yml",
      });
      const html = generateFullHtml([r]);
      expect(html).toContain("Parameters");
      expect(html).toContain("limit");
      expect(html).toContain("42");
      expect(html).toContain("name");
      expect(html).toContain("maxItems");
      expect(html).toContain("enabled");
      expect(html).toContain("true");
      expect(html).toContain("parameters-table");
    });

    it("GRD-HTML-005: renders parameters in a table with Name and Value columns", () => {
      const r = req("GRD-TBL-001", "Table requirement", {
        parameters: { alpha: "one", beta: "two" },
        sourcePath: "/p/GRD-TBL-001.req.yml",
      });
      const html = generateFullHtml([r]);
      expect(html).toContain('<table class="parameters-table">');
      expect(html).toContain("<thead>");
      expect(html).toContain("<th>Name</th>");
      expect(html).toContain("<th>Value</th>");
      expect(html).toContain("<tbody>");
      expect(html).toMatch(/<tr><td>alpha<\/td><td>one<\/td><\/tr>/);
      expect(html).toMatch(/<tr><td>beta<\/td><td>two<\/td><\/tr>/);
    });

    it("does not show Parameters section when requirement has no parameters", () => {
      const r = req("GRD-NOP-001", "No params");
      const html = generateFullHtml([r]);
      expect(html).not.toContain("parameters-block");
      const detailSection = html.slice(html.indexOf('id="GRD-NOP-001"'), html.indexOf("</section>"));
      expect(detailSection).not.toContain('<span class="label">Parameters</span>');
    });
  });

  describe("GRD-HTML-002", () => {
    it("includes a list of requirements that link to each requirement (reverse lookup)", () => {
      const requirements = [
        req("GRD-A", "Target", {}),
        req("GRD-B", "Linker", { links: [{ satisfies: "GRD-A" }] }),
        req("GRD-C", "Also linker", { links: [{ satisfies: "GRD-A" }] }),
      ];
      const html = generateFullHtml(requirements);
      expect(html).toContain("Linked from");
      expect(html).toContain('href="#GRD-B"');
      expect(html).toContain('href="#GRD-C"');
      const detailA = html.slice(html.indexOf('id="GRD-A"'), html.indexOf("</section>"));
      expect(detailA).toContain("Linked from");
      expect(detailA).toContain("GRD-B");
      expect(detailA).toContain("GRD-C");
    });

    it("shows no Linked from when no requirements link to it", () => {
      const requirements = [
        req("GRD-X", "Orphan", {}),
        req("GRD-Y", "Child", { links: [{ satisfies: "GRD-X" }] }),
      ];
      const html = generateFullHtml(requirements);
      const startY = html.indexOf('id="GRD-Y"');
      const detailY = html.slice(startY, html.indexOf("</section>", startY));
      expect(detailY).not.toContain("Linked from");
      const startX = html.indexOf('id="GRD-X"');
      const detailX = html.slice(startX, html.indexOf("</section>", startX));
      expect(detailX).toContain("Linked from");
      expect(detailX).toContain("GRD-Y");
    });
  });

  describe("GRD-HTML-003: top-level index grouped by category", () => {
    it("includes an Index section with hierarchical list by category", () => {
      const requirements = [
        req("GRD-HTML-001", "HTML report", { categoryPath: ["html-report"] }),
        req("GRD-HTML-002", "Linked from", { categoryPath: ["html-report"] }),
        req("GRD-SYS-001", "Core", { categoryPath: ["sys"] }),
      ];
      const html = generateFullHtml(requirements);
      expect(html).toContain("<h2>Index</h2>");
      expect(html).toContain('class="index-category"');
      expect(html).toContain("html-report");
      expect(html).toContain("sys");
      const indexSection = html.slice(html.indexOf("<h2>Index</h2>"), html.indexOf("<h2>Details</h2>"));
      expect(indexSection).toContain('href="#GRD-HTML-001"');
      expect(indexSection).toContain('href="#GRD-HTML-002"');
      expect(indexSection).toContain('href="#GRD-SYS-001"');
    });

    it("includes root-level requirements in index when categoryPath is empty", () => {
      const requirements = [
        req("GRD-TOP-001", "Top level", { categoryPath: [] }),
      ];
      const html = generateFullHtml(requirements);
      expect(html).toContain("<h2>Index</h2>");
      const indexSection = html.slice(html.indexOf("<h2>Index</h2>"), html.indexOf("<h2>Details</h2>"));
      expect(indexSection).toContain('href="#GRD-TOP-001"');
      expect(indexSection).toContain("Top level");
    });

    it("renders nested categories in index", () => {
      const requirements = [
        req("GRD-DEEP-001", "Nested req", { categoryPath: ["cli", "sub"] }),
      ];
      const html = generateFullHtml(requirements);
      expect(html).toContain("<h2>Index</h2>");
      expect(html).toContain("cli");
      expect(html).toContain("sub");
      expect(html).toContain('href="#GRD-DEEP-001"');
    });
  });

  describe("GRD-HTML-004: description and rationale rendered as Markdown", () => {
    it("renders description as Markdown", () => {
      const r = req("GRD-MD-001", "Title", {
        description: "Plain and **bold** and *italic* text.",
      });
      const html = generateFullHtml([r]);
      expect(html).toContain("<strong>bold</strong>");
      expect(html).toContain("<em>italic</em>");
      expect(html).toContain("Plain and");
    });

    it("renders rationale attribute as Markdown", () => {
      const r = req("GRD-MD-002", "Title", {
        description: "Desc",
        attributes: { rationale: "Reason with `code` and **emphasis**." },
      });
      const html = generateFullHtml([r]);
      expect(html).toContain("<code>code</code>");
      expect(html).toContain("<strong>emphasis</strong>");
      expect(html).toContain("Rationale");
    });

    it("escapes HTML in markdown source (description and rationale)", () => {
      const r = req("GRD-MD-003", "Title", {
        description: "Text with <script>alert(1)</script> here",
        attributes: { rationale: "Rationale with <b>tag</b>." },
      });
      const html = generateFullHtml([r]);
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });

  describe("GRD-HTML-006: link requirement references in text", () => {
    it("links requirement IDs referenced in description and rationale to definitions", () => {
      const requirements = [
        req("GRD-HTML-001", "Target 1"),
        req("GRD-HTML-002", "Target 2"),
        req("GRD-REF-001", "Reference holder", {
          description: "See GRD-HTML-001 for base behavior.",
          attributes: { rationale: "Also depends on GRD-HTML-002." },
        }),
      ];
      const html = generateFullHtml(requirements);
      const start = html.indexOf('id="GRD-REF-001"');
      const detail = html.slice(start, html.indexOf("</section>", start));
      expect(detail).toContain('href="#GRD-HTML-001"');
      expect(detail).toContain('href="#GRD-HTML-002"');
    });

    it("does not link unknown IDs that are not requirement definitions", () => {
      const requirements = [
        req("GRD-HTML-001", "Target"),
        req("GRD-REF-002", "Reference holder", {
          description: "Mentions GRD-UNKNOWN-999 as plain text.",
        }),
      ];
      const html = generateFullHtml(requirements);
      const start = html.indexOf('id="GRD-REF-002"');
      const detail = html.slice(start, html.indexOf("</section>", start));
      expect(detail).not.toContain('href="#GRD-UNKNOWN-999"');
      expect(detail).toContain("GRD-UNKNOWN-999");
    });
  });
});

describe("generateSingleRequirementHtml (GRD-VSC-003)", () => {
  it("renders one requirement with same structure as full report", () => {
    const r = req("GRD-VSC-003", "Requirement editor preview");
    const html = generateSingleRequirementHtml(r);
    expect(html).toContain('id="GRD-VSC-003"');
    expect(html).toContain("Requirement editor preview");
    expect(html).toContain("class=\"requirement-detail\"");
    expect(html).toContain("class=\"meta\"");
    expect(html).toContain("class=\"source\"");
    expect(html).toContain("class=\"description\"");
  });

  it("shares base structure and styling with full report", () => {
    const r = req("GRD-X-001", "Title", {
      description: "Body",
      attributes: { status: "active" },
      links: [{ satisfies: "GRD-X-000" }],
    });
    const single = generateSingleRequirementHtml(r);
    const full = generateFullHtml([r]);
    // Same structural elements
    expect(single).toContain("<html lang=\"en\">");
    expect(single).toContain("requirement-detail");
    expect(single).toContain("meta");
    expect(single).toContain("source");
    expect(single).toContain("description");
    // Same styling tokens as full report
    expect(single).toContain("font-family: system-ui, sans-serif");
    expect(single).toContain("max-width: 60rem");
    expect(full).toContain("font-family: system-ui, sans-serif");
    expect(full).toContain("max-width: 60rem");
    // Single has requirement-specific title
    expect(single).toContain("<title>Requirement GRD-X-001</title>");
  });

  it("escapes HTML in requirement fields", () => {
    const r = req("ID", "Title <script>", {
      description: "Desc & \"quoted\"",
      sourcePath: "/p/ID.req.yml",
    });
    const html = generateSingleRequirementHtml(r);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
  });

  it("GRD-VSC-006: optional markers tag description and rationale for the preview editor", () => {
    const r = req("GRD-E-001", "T", {
      description: "Hello",
      attributes: { rationale: "Why" },
      sourcePath: "/p/req.req.yml",
    });
    const marked = generateSingleRequirementHtml(r, undefined, { editableFieldMarkers: true });
    expect(marked).toContain('data-gitreqd-field="description"');
    expect(marked).toContain('data-gitreqd-field="rationale"');
    const plain = generateSingleRequirementHtml(r);
    expect(plain).not.toContain("data-gitreqd-field");
  });
});

describe("GRD-SYS-005: parameterization in HTML export", () => {
  it("resolves local parameter in title and description and styles as param-value", () => {
    const r = req("GRD-P-001", "Limit is {{ :limit }}", {
      description: "The maximum count is {{ :limit }} items.",
      parameters: { limit: 42 },
      sourcePath: "/p/GRD-P-001.req.yml",
    });
    const html = generateFullHtml([r]);
    expect(html).toMatch(/Limit is .*42/);
    expect(html).toMatch(/maximum count is .*42.* items/);
    expect(html).toContain('class="param-value"');
    expect(html).toContain('data-source-req="GRD-P-001"');
    expect(html).toContain('data-param="limit"');
  });

  it("resolves cross-requirement parameter and links to source requirement", () => {
    const rA = req("GRD-A", "Source", {
      parameters: { max: 100 },
      sourcePath: "/p/GRD-A.req.yml",
    });
    const rB = req("GRD-B", "Consumer", {
      description: "Max from A is {{ GRD-A:max }}.",
      sourcePath: "/p/GRD-B.req.yml",
    });
    const html = generateFullHtml([rA, rB]);
    expect(html).toMatch(/Max from A is .*100.*\./);
    expect(html).toContain('href="#GRD-A"');
    expect(html).toContain('data-source-req="GRD-A"');
    expect(html).toContain('data-param="max"');
  });

  it("resolves parameters in rationale (attributes)", () => {
    const r = req("GRD-R-001", "Title", {
      description: "Desc",
      attributes: { rationale: "Because {{ :reason }}." },
      parameters: { reason: "traceability" },
      sourcePath: "/p/GRD-R-001.req.yml",
    });
    const html = generateFullHtml([r]);
    expect(html).toMatch(/Because .*traceability.*\./);
    expect(html).toContain('class="param-value"');
  });

  it("single-requirement HTML resolves params when allRequirements provided", () => {
    const rA = req("GRD-A", "A", { parameters: { x: "10" }, sourcePath: "/a.req.yml" });
    const rB = req("GRD-B", "B", {
      description: "Value: {{ GRD-A:x }}",
      sourcePath: "/b.req.yml",
    });
    const html = generateSingleRequirementHtml(rB, [rA, rB]);
    expect(html).toMatch(/Value: .*10/);
    expect(html).toContain('class="param-value"');
  });
});
