import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Directory where `next` is installed (npm may hoist to the gitreqd-cloud root
 * or keep it under `gitreqd/`). Wrong `outputFileTracingRoot` omits
 * `next/dist/compiled/...` from the Vercel serverless bundle and fails at runtime.
 */
function outputFileTracingRoot(): string {
  let dir = path.resolve(__dirname, "..", "..");
  const fallback = dir;
  for (;;) {
    if (
      fs.existsSync(path.join(dir, "node_modules", "next", "package.json"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return fallback;
    }
    dir = parent;
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@gitreqd/browser-auth"],
  outputFileTracingRoot: outputFileTracingRoot(),
};

export default nextConfig;
