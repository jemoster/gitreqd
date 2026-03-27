import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT_MARKER } from "@gitreqd/core";
import { startBrowserServer } from "../src/browser-cmd";

function makeProject(): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-browser-"));
  fs.writeFileSync(path.join(tmp, ROOT_MARKER), "requirement_dirs:\n  - requirements\n", "utf-8");
  fs.mkdirSync(path.join(tmp, "requirements"), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, "requirements", "GRD-A-001.req.yml"),
    [
      "id: GRD-A-001",
      "title: Root",
      "description: Root requirement with **markdown** and value {{ :root_param }}",
      "attributes:",
      "  rationale: |",
      "    Root rationale with *emphasis*.",
      "parameters:",
      "  root_param: alpha",
      "",
    ].join("\n"),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(tmp, "requirements", "GRD-A-002.req.yml"),
    [
      "id: GRD-A-002",
      "title: Child",
      "description: Child requirement",
      "links:",
      "  - satisfies: GRD-A-001",
      "",
    ].join("\n"),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(tmp, "requirements", "GRD-A-003.req.yml"),
    [
      "id: GRD-A-003",
      "title: Sibling",
      "description: Sibling requirement",
      "",
    ].join("\n"),
    "utf-8"
  );
  return tmp;
}

describe("GRD-API-001/GRD-LOCAL-001/GRD-UI-001 browser server", () => {
  it("serves requirements, status, and allows link updates", async () => {
    const project = makeProject();
    const started = await startBrowserServer(project, 0);
    if ("success" in started) {
      throw new Error(started.error ?? "Expected server to start");
    }
    const base = `http://127.0.0.1:${started.port}`;
    try {
      const listRes = await fetch(`${base}/api/requirements`);
      expect(listRes.ok).toBe(true);
      const listJson = (await listRes.json()) as { requirements: Array<{ id: string }> };
      expect(listJson.requirements.map((r) => r.id).sort()).toEqual(["GRD-A-001", "GRD-A-002", "GRD-A-003"]);

      const oneRes = await fetch(`${base}/api/requirements/GRD-A-001`);
      expect(oneRes.ok).toBe(true);
      const oneJson = (await oneRes.json()) as { requirement: { id: string } };
      expect(oneJson.requirement.id).toBe("GRD-A-001");

      const renderedRes = await fetch(`${base}/api/requirements/GRD-A-001/rendered-detail`);
      expect(renderedRes.ok).toBe(true);
      const renderedJson = (await renderedRes.json()) as { html: string };
      expect(renderedJson.html).toContain('class="requirement-detail"');
      expect(renderedJson.html).toContain('class="parameters-table"');
      expect(renderedJson.html).toContain("<strong>markdown</strong>");
      expect(renderedJson.html).toContain('class="linked-from-list"');

      const statusRes = await fetch(`${base}/api/status`);
      expect(statusRes.ok).toBe(true);
      const statusJson = (await statusRes.json()) as { requirementCount: number; errors: unknown[] };
      expect(statusJson.requirementCount).toBe(3);
      expect(statusJson.errors).toEqual([]);

      const addRes = await fetch(`${base}/api/requirements/GRD-A-001/links`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "add", link: { satisfies: "GRD-A-003" } }),
      });
      expect(addRes.ok).toBe(true);

      const updatedRes = await fetch(`${base}/api/requirements/GRD-A-001`);
      const updatedJson = (await updatedRes.json()) as {
        requirement: { links: Array<{ satisfies?: string }> };
      };
      expect(updatedJson.requirement.links.some((l) => l.satisfies === "GRD-A-003")).toBe(true);

      const removeRes = await fetch(`${base}/api/requirements/GRD-A-001/links`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "remove", link: { satisfies: "GRD-A-003" } }),
      });
      expect(removeRes.ok).toBe(true);

      const finalRes = await fetch(`${base}/api/requirements/GRD-A-001`);
      const finalJson = (await finalRes.json()) as {
        requirement: { links: Array<{ satisfies?: string }> };
      };
      expect(finalJson.requirement.links.some((l) => l.satisfies === "GRD-A-003")).toBe(false);
    } finally {
      await started.close();
    }
  });

  it("returns machine-readable error payloads", async () => {
    const project = makeProject();
    const started = await startBrowserServer(project, 0);
    if ("success" in started) {
      throw new Error(started.error ?? "Expected server to start");
    }
    const base = `http://127.0.0.1:${started.port}`;
    try {
      const badRes = await fetch(`${base}/api/requirements/NOPE`);
      expect(badRes.status).toBe(404);
      const badJson = (await badRes.json()) as { error: { code: string; message: string } };
      expect(badJson.error.code).toBe("NOT_FOUND");
      expect(typeof badJson.error.message).toBe("string");
    } finally {
      await started.close();
    }
  });

  it("serves shared UI stylesheet and split-pane shell (GRD-UI-002)", async () => {
    const project = makeProject();
    const started = await startBrowserServer(project, 0);
    if ("success" in started) {
      throw new Error(started.error ?? "Expected server to start");
    }
    const base = `http://127.0.0.1:${started.port}`;
    try {
      const htmlRes = await fetch(`${base}/`);
      expect(htmlRes.ok).toBe(true);
      const html = await htmlRes.text();
      expect(html).toContain('href="/browser-ui.css"');
      expect(html).toContain('id="sidebar-divider"');
      expect(html).toContain("tree-row-btn");
      expect(html).toContain("tree-icon");
      expect(html).toContain('searchParams.set("req", id)');
      expect(html).toContain('window.addEventListener("popstate"');

      const cssRes = await fetch(`${base}/browser-ui.css`);
      expect(cssRes.ok).toBe(true);
      expect(cssRes.headers.get("content-type")).toContain("text/css");
      const css = await cssRes.text();
      expect(css).toContain("--color-bg-primary");
      expect(css).toContain("--font-mono");
      expect(css).toContain("--space-1");
      expect(css).toContain("--radius-sm");
      expect(css).toContain("--border-hairline");
      expect(css).toContain("--sidebar-width");
      expect(css).toContain(".tree-row-btn");
      expect(css).toContain(".tree-icon");
      expect(css).toContain(".req-id");
      expect(css).toContain("white-space: nowrap");
      expect(css).toContain(".detail-report .parameters-table");
    } finally {
      await started.close();
    }
  });
});
