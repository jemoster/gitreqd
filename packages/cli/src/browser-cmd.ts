import fs from "node:fs";
import http from "node:http";
import {
  discoverProjectRootCandidates,
  formatRequirementToYaml,
  generateSingleRequirementHtml,
  loadRequirements,
  ROOT_MARKER_HINT,
} from "@gitreqd/core";
import type { Requirement, RequirementWithSource } from "@gitreqd/core";
import { BROWSER_UI_HTML } from "./browser-ui-html.js";
import { BROWSER_UI_CSS } from "./browser-ui-css.js";

interface ApiError {
  code: string;
  message: string;
}

interface BrowserServerResult {
  success: boolean;
  error?: string;
}

export interface RunningBrowserServer {
  port: number;
  close: () => Promise<void>;
}

function requirementPayloadForYaml(r: RequirementWithSource): Requirement {
  const payload: Requirement = {
    id: r.id,
    title: r.title,
    description: r.description,
  };
  if (r.attributes !== undefined) payload.attributes = r.attributes;
  if (r.links !== undefined) payload.links = r.links;
  if (r.parameters !== undefined) payload.parameters = r.parameters;
  return payload;
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function apiError(res: http.ServerResponse, status: number, error: ApiError): void {
  json(res, status, { error });
}

function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += String(chunk);
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function toApiRequirement(req: RequirementWithSource): Record<string, unknown> {
  return {
    id: req.id,
    title: req.title,
    category: req.categoryPath ?? [],
    description: req.description,
    attributes: req.attributes ?? {},
    links: req.links ?? [],
    parameters: req.parameters ?? {},
    sourcePath: req.sourcePath,
  };
}

function extractBodyHtml(htmlDoc: string): string {
  const match = htmlDoc.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1].trim() : htmlDoc;
}

/**
 * GRD-LOCAL-001 + GRD-API-001 + GRD-BRW-001 + GRD-HTML-001 + GRD-HTML-002:
 * Run a local browser server with REST API and UI over localhost.
 */
export async function runBrowser(projectDir: string, port: number): Promise<BrowserServerResult> {
  const started = await startBrowserServer(projectDir, port);
  if (!("close" in started)) {
    return started;
  }
  console.log(`Browser UI server running at http://127.0.0.1:${started.port}`);
  console.log("Press Ctrl+C to stop.");

  // Keep the CLI process alive so the server remains running.
  // Ctrl+C (SIGINT) will stop the server and let the command exit cleanly.
  await new Promise<void>((resolve) => {
    let stopped = false;
    const stop = async (): Promise<void> => {
      if (stopped) return;
      stopped = true;
      try {
        await started.close();
      } catch {
        // Ignore close errors; we're stopping anyway.
      } finally {
        resolve();
      }
    };

    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });

  return { success: true };
}

export async function startBrowserServer(
  projectDir: string,
  port: number
): Promise<BrowserServerResult | RunningBrowserServer> {
  const candidates = await discoverProjectRootCandidates(projectDir);
  if (candidates.length === 0) {
    const error = `No project root found (missing ${ROOT_MARKER_HINT})`;
    console.error(`${error}. Run from a directory that contains ${ROOT_MARKER_HINT} or use --project-dir.`);
    return { success: false, error };
  }
  const root = candidates[0]!;
  const html = BROWSER_UI_HTML;
  const css = BROWSER_UI_CSS;

  const server = http.createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const parsed = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const pathname = parsed.pathname;

      if (method === "GET" && (pathname === "/" || pathname === "/index.html")) {
        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }
      if (method === "GET" && pathname === "/browser-ui.css") {
        res.statusCode = 200;
        res.setHeader("content-type", "text/css; charset=utf-8");
        res.end(css);
        return;
      }

      if (method === "GET" && pathname === "/api/requirements") {
        const { requirements } = await loadRequirements(root, root);
        // UI shows validation details separately via `/api/status`.
        json(res, 200, { requirements: requirements.map(toApiRequirement) });
        return;
      }

      if (method === "GET" && pathname.startsWith("/api/requirements/")) {
        const id = decodeURIComponent(pathname.slice("/api/requirements/".length));
        if (id.endsWith("/rendered-detail")) {
          const reqId = id.slice(0, -"/rendered-detail".length);
          const { requirements } = await loadRequirements(root, root);
          const reqById = requirements.find((r) => r.id === reqId);
          if (!reqById) {
            apiError(res, 404, { code: "NOT_FOUND", message: `Requirement not found: ${reqId}` });
            return;
          }
          const renderedDoc = generateSingleRequirementHtml(reqById, requirements);
          json(res, 200, { html: extractBodyHtml(renderedDoc) });
          return;
        }
        const { requirements } = await loadRequirements(root, root);
        const reqById = requirements.find((r) => r.id === id);
        if (!reqById) {
          apiError(res, 404, { code: "NOT_FOUND", message: `Requirement not found: ${id}` });
          return;
        }
        json(res, 200, { requirement: toApiRequirement(reqById) });
        return;
      }

      if (method === "GET" && pathname === "/api/status") {
        const { requirements, errors } = await loadRequirements(root, root);
        json(res, 200, {
          requirementCount: requirements.length,
          errors,
        });
        return;
      }

      if (method === "PATCH" && pathname.startsWith("/api/requirements/") && pathname.endsWith("/links")) {
        const id = decodeURIComponent(
          pathname.slice("/api/requirements/".length, pathname.length - "/links".length)
        );
        const body = await readRequestBody(req);
        let parsedBody: unknown;
        try {
          parsedBody = JSON.parse(body);
        } catch {
          apiError(res, 400, { code: "INVALID_JSON", message: "Request body must be valid JSON." });
          return;
        }
        if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
          apiError(res, 400, { code: "INVALID_BODY", message: "Request body must be an object." });
          return;
        }
        const payload = parsedBody as Record<string, unknown>;
        const operation = payload.operation;
        const link = payload.link;
        if ((operation !== "add" && operation !== "remove") || !link || typeof link !== "object") {
          apiError(res, 400, {
            code: "INVALID_BODY",
            message: 'Body must include "operation" ("add"|"remove") and a "link" object.',
          });
          return;
        }

        const { requirements } = await loadRequirements(root, root);

        const target = requirements.find((r) => r.id === id);
        if (!target) {
          apiError(res, 404, { code: "NOT_FOUND", message: `Requirement not found: ${id}` });
          return;
        }

        const nextLinks = [...(target.links ?? [])];
        const targetKey = stableStringify(link);
        if (operation === "add") {
          nextLinks.push(link as Record<string, unknown>);
        } else {
          const idx = nextLinks.findIndex((entry) => stableStringify(entry) === targetKey);
          if (idx === -1) {
            apiError(res, 404, {
              code: "LINK_NOT_FOUND",
              message: "Could not remove link because the exact entry was not found.",
            });
            return;
          }
          nextLinks.splice(idx, 1);
        }

        const updated: RequirementWithSource = { ...target, links: nextLinks };
        const yaml = formatRequirementToYaml(requirementPayloadForYaml(updated));
        fs.writeFileSync(target.sourcePath, yaml, "utf-8");

        const reloaded = await loadRequirements(root, root);
        const updatedReq = reloaded.requirements.find((r) => r.id === id);
        if (!updatedReq) {
          apiError(res, 500, {
            code: "RELOAD_FAILED",
            message: "Requirement update was written but could not be reloaded.",
          });
          return;
        }
        json(res, 200, { requirement: toApiRequirement(updatedReq) });
        return;
      }

      apiError(res, 404, { code: "NOT_FOUND", message: "Route not found." });
    } catch (err) {
      apiError(res, 500, { code: "INTERNAL_ERROR", message: String(err) });
    }
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", () => resolve());
    });
  } catch (err) {
    // Ensure we don't leave a half-open server around.
    try {
      server.close();
    } catch {
      // Ignore
    }
    const code = (err as { code?: unknown } | null)?.code;
    if (code === "EADDRINUSE") {
      const error = `Port ${port} is already in use. Stop the existing server or choose another port (use --port).`;
      console.error(error);
      return { success: false, error };
    }
    const error = `Failed to start server: ${String(err)}`;
    console.error(error);
    return { success: false, error };
  }
  const address = server.address();
  const resolvedPort =
    address && typeof address === "object" && "port" in address ? Number(address.port) : port;
  return {
    port: resolvedPort,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}
