/**
 * Node-free entry and browser WASM packaging: subpath exports must not pull
 * glob/node:fs, and the web glue must instantiate via init() rather than fs.
 */
import fs from "node:fs";
import path from "node:path";
import { generateSingleRequirementHtml, initGitreqdWasm } from "@gitreqd/core/html";
import type { RequirementWithSource } from "@gitreqd/core/types";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const CORE_PKG = path.join(REPO_ROOT, "packages", "core", "package.json");
const DIST = path.join(REPO_ROOT, "packages", "core", "dist");

function read(rel: string): string {
  return fs.readFileSync(path.join(DIST, rel), "utf-8");
}

function importedSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const re = /(?:from|import)\s+["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    specs.push(match[1]!);
  }
  return specs;
}

function followRelativeGraph(entryRel: string, remap: Record<string, string>): Set<string> {
  const visited = new Set<string>();
  const queue = [entryRel];
  while (queue.length > 0) {
    const rel = queue.pop()!;
    const mapped = remap[rel] ?? rel;
    if (visited.has(mapped)) continue;
    visited.add(mapped);
    const abs = path.join(DIST, mapped);
    if (!fs.existsSync(abs) || !mapped.endsWith(".js")) continue;
    const src = fs.readFileSync(abs, "utf-8");
    for (const spec of importedSpecifiers(src)) {
      if (!spec.startsWith(".")) continue;
      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(mapped.replace(/\\/g, "/")), spec)
      );
      queue.push(resolved.startsWith("./") ? resolved.slice(2) : resolved);
    }
  }
  return visited;
}

describe("Node-free HTML / engine entries", () => {
  it("package.json exposes html, types, engine, and wasm with browser/node conditions", () => {
    const pkg = JSON.parse(fs.readFileSync(CORE_PKG, "utf-8")) as {
      exports: Record<string, Record<string, string>>;
      browser: Record<string, string>;
    };
    expect(pkg.exports["./html"]?.import).toBe("./dist/html.js");
    expect(pkg.exports["./html"]?.browser).toBe("./dist/html.js");
    expect(pkg.exports["./types"]?.types).toBe("./dist/types.d.ts");
    expect(pkg.exports["./engine"]?.import).toBe("./dist/engine.js");
    expect(pkg.exports["./wasm"]?.browser).toBe("./dist/wasm.browser.js");
    expect(pkg.exports["./wasm"]?.node).toBe("./dist/wasm.js");
    expect(pkg.exports["."]?.browser).toBe("./dist/browser.js");
    expect(pkg.browser["./dist/wasm.js"]).toBe("./dist/wasm.browser.js");
  });

  it("dist exists so the module graph can be inspected", () => {
    expect(fs.existsSync(path.join(DIST, "html.js"))).toBe(true);
    expect(fs.existsSync(path.join(DIST, "wasm.browser.js"))).toBe(true);
    expect(fs.existsSync(path.join(DIST, "wasm-web", "gitreqd_wasm.js"))).toBe(true);
    expect(fs.existsSync(path.join(DIST, "wasm-web", "gitreqd_wasm_bg.wasm"))).toBe(true);
  });

  it("html and engine dist graphs never import fs-adapter or glob", () => {
    const files = followRelativeGraph("html.js", {});
    expect(files.has("html.js")).toBe(true);
    expect(files.has("engine.js")).toBe(true);
    expect(files.has("fs-adapter.js")).toBe(false);
    expect(files.has("profile.js")).toBe(false);
    expect(read("html.js")).not.toMatch(/node:fs|\bglob\b|fs-adapter/);
    expect(read("engine.js")).not.toMatch(/node:fs|\bglob\b|fs-adapter/);
    expect(read("types.js")).not.toMatch(/node:fs|\bglob\b|fs-adapter/);
  });

  it("browser remapping replaces Node wasm glue with the web target", () => {
    const files = followRelativeGraph("html.js", { "wasm.js": "wasm.browser.js" });
    expect(files.has("wasm.browser.js")).toBe(true);
    expect(files.has("wasm.js")).toBe(false);
    const joined = [...files]
      .filter((rel) => rel.endsWith(".js"))
      .map((rel) => read(rel))
      .join("\n");
    expect(joined).not.toContain("readFileSync");
    expect(joined).not.toContain("node:fs");
    expect(joined).not.toContain("createRequire");
    expect(joined).not.toMatch(/from ["']glob["']/);
    expect(read("wasm-web/gitreqd_wasm.js")).toContain("import.meta.url");
    expect(read("wasm-web/gitreqd_wasm.js")).toContain("__wbg_init");
  });

  it("browser barrel does not import the Node filesystem adapter", () => {
    const files = followRelativeGraph("browser.js", { "wasm.js": "wasm.browser.js" });
    expect(files.has("fs-adapter.js")).toBe(false);
    expect(files.has("profile.js")).toBe(false);
    expect(files.has("html.js")).toBe(true);
  });

  it("generateSingleRequirementHtml from @gitreqd/core/html works after initGitreqdWasm", async () => {
    await initGitreqdWasm();
    const requirement: RequirementWithSource = {
      id: "GRD-HTML-ENTRY-001",
      title: "HTML entry",
      require: "The HTML subpath shall render without the filesystem adapter.",
      refinement: "",
      sourcePath: "GRD-HTML-ENTRY-001.req.yml",
    };
    const html = generateSingleRequirementHtml(requirement, [requirement]);
    expect(html).toContain("GRD-HTML-ENTRY-001");
    expect(html).toContain('class="require"');
  });
});
