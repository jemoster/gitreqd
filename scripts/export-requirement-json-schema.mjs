/**
 * Optional: emit JSON Schema for requirement YAML without a project root (no marker required).
 * Prefer `gitreqd schema` when you have a project: it uses the same discovery as other commands
 * and can reflect project configuration when schema composition uses it.
 * The VS Code extension also generates schema at activation (see requirement-yaml-schema.ts).
 * Requires `packages/core` to be built (`npm run build -w @gitreqd/core`).
 *
 * Usage: node scripts/export-requirement-json-schema.mjs [outfile]
 * Default outfile: out/requirement-schema.json (directory `out/` is gitignored).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const { exportRequirementFileJsonSchema } = await import(
  join(root, "packages/core/dist/requirement-schema.js")
);
const json = exportRequirementFileJsonSchema();
const text = `${JSON.stringify(json, null, 2)}\n`;
const outPath = process.argv[2] ?? join(root, "out/requirement-schema.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, text, "utf-8");
process.stderr.write(`Wrote ${outPath}\n`);
