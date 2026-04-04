import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { discoverProjectRootCandidates, ROOT_MARKER_HINT } from "@gitreqd/core";

interface BrowserServerResult {
  success: boolean;
  error?: string;
}

export interface RunningBrowserServer {
  port: number;
  close: () => Promise<void>;
}

/**
 * GRD-AUTH-003: Extra environment variables for the Next.js child process
 * (e.g. tests enabling optional API middleware).
 */
export interface StartBrowserServerOptions {
  childEnv?: Record<string, string>;
}

function findMonorepoRootWalkingUp(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 12; i++) {
    const nextBin = path.join(dir, "node_modules/next/dist/bin/next");
    const webPkg = path.join(dir, "packages/web/package.json");
    if (fs.existsSync(nextBin) && fs.existsSync(webPkg)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

/**
 * Resolve the gitreqd monorepo root (contains `packages/web` and hoisted `node_modules/next`).
 */
export function resolveGitreqdMonorepoRoot(): string | null {
  const override = process.env.GITREQD_MONOREPO_ROOT?.trim();
  if (override && fs.existsSync(path.join(override, "packages/web/package.json"))) {
    return path.resolve(override);
  }
  return findMonorepoRootWalkingUp(process.cwd());
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const a = s.address();
      const p = typeof a === "object" && a && "port" in a ? Number(a.port) : 0;
      s.close(() => resolve(p));
    });
    s.on("error", reject);
  });
}

async function waitForLocalNextReady(port: number, timeoutMs: number): Promise<void> {
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${base}/`);
      if (r.ok) {
        return;
      }
      lastErr = new Error(`HTTP ${r.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Next.js did not become ready at ${base} within ${timeoutMs}ms: ${String(lastErr)}`);
}

/**
 * GRD-LOCAL-001 + GRD-API-001 + GRD-UI-004: Run the Next.js browser UI (`packages/web`) against a project directory.
 */
export async function runBrowser(projectDir: string, port: number): Promise<BrowserServerResult> {
  const started = await startBrowserServer(projectDir, port);
  if (!("close" in started)) {
    return started;
  }
  console.log(`Browser UI running at http://127.0.0.1:${started.port}`);
  console.log("Press Ctrl+C to stop.");

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
  port: number,
  options?: StartBrowserServerOptions
): Promise<BrowserServerResult | RunningBrowserServer> {
  const candidates = await discoverProjectRootCandidates(projectDir);
  if (candidates.length === 0) {
    const error = `No project root found (missing ${ROOT_MARKER_HINT})`;
    console.error(`${error}. Run from a directory that contains ${ROOT_MARKER_HINT} or use --project-dir.`);
    return { success: false, error };
  }
  const projectRoot = candidates[0]!;

  const monorepoRoot = resolveGitreqdMonorepoRoot();
  if (!monorepoRoot) {
    const msg =
      "Could not find the gitreqd Next.js app. Clone the gitreqd repository, run npm ci at the repo root, " +
      "or set GITREQD_MONOREPO_ROOT to that directory.";
    console.error(msg);
    return { success: false, error: msg };
  }

  const nextBin = path.join(monorepoRoot, "node_modules/next/dist/bin/next");
  if (!fs.existsSync(nextBin)) {
    const error = "Next.js is not installed. Run npm ci at the gitreqd repository root.";
    console.error(error);
    return { success: false, error };
  }

  const listenPort = port === 0 ? await getFreePort() : port;
  const webCwd = path.join(monorepoRoot, "packages/web");
  const quiet = process.env.GITREQD_BROWSER_TEST_QUIET === "1";

  const child: ChildProcess = spawn(
    process.execPath,
    [nextBin, "dev", "-p", String(listenPort), "-H", "127.0.0.1"],
    {
      cwd: webCwd,
      env: {
        ...process.env,
        GITREQD_PROJECT_ROOT: projectRoot,
        GITREQD_LOCAL_DEV: "1",
        ...options?.childEnv,
      },
      stdio: quiet ? "pipe" : "inherit",
    }
  );

  if (quiet && child.stdout && child.stderr) {
    child.stdout.on("data", () => {});
    child.stderr.on("data", () => {});
  }

  try {
    await waitForLocalNextReady(listenPort, 120_000);
  } catch (e) {
    const msg = String(e);
    console.error(msg);
    try {
      child.kill("SIGTERM");
    } catch {
      // ignore
    }
    return { success: false, error: msg };
  }

  return {
    port: listenPort,
    close: () =>
      new Promise<void>((resolve) => {
        let settled = false;
        const finish = (): void => {
          if (settled) return;
          settled = true;
          resolve();
        };
        child.once("exit", finish);
        try {
          child.kill("SIGTERM");
        } catch {
          finish();
          return;
        }
        setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            /* ignore */
          }
          finish();
        }, 8000).unref();
      }),
  };
}
