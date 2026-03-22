#!/usr/bin/env node

import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { runValidate } from "./validate-cmd.js";
import { runHtml } from "./html-cmd.js";
import { runResolveConflicts } from "./resolve-conflicts-cmd.js";
import { runBootstrap } from "./bootstrap-cmd.js";
import { runSchema } from "./schema-cmd.js";

const DEFAULT_OUTPUT_DIR = ".";

const GENERAL_HELP = `gitreqd – requirement discovery and validation

Usage: gitreqd <command> [options]

Commands:
  validate          Check requirement files for schema, duplicate IDs, and broken links
  html              Generate an HTML report of all requirements
  schema            Print the requirement schema for the current project (JSON Schema or YAML)
  bootstrap         Initialize a directory with gitreqd.yaml and a requirements folder
  resolve-conflicts Resolve merge conflicts in requirement files using LLM (GRD-GIT-002)

Options (global):
  -h, --help           Show this help or command-specific help
  --project-dir <dir>  Project directory (default: current directory)

Run 'gitreqd <command> --help' for command-specific options.
`;

const SCHEMA_HELP = `gitreqd schema – print the effective requirement schema for the project

Usage: gitreqd schema [options]

Writes the requirement schema (as used for validation) to standard output or to a file.
Uses the same project root discovery as other commands. When project configuration affects
the schema, the output reflects that project.

Options:
  -h, --help              Show this help
  --project-dir <dir>     Project directory to search (default: current directory)
  --format <name>         Output format: json-schema (default) or yaml
  -o, --output <file>     Write to this file instead of stdout
`;

const VALIDATE_HELP = `gitreqd validate – validate requirement files

Usage: gitreqd validate [options]

Validates requirement YAML files under the project root: schema compliance,
unique IDs, filename-ID match, and satisfies reference existence.

Options:
  -h, --help           Show this help
  --project-dir <dir>  Project directory to search (default: current directory)
`;

const HTML_HELP = `gitreqd html – generate HTML requirements report

Usage: gitreqd html [options]

Generates index.html listing all requirements and their details.

Options:
  -h, --help           Show this help
  --project-dir <dir>  Project directory to search (default: current directory)
  -o, --output <dir>   Output directory for index.html (default: .)
`;

const BOOTSTRAP_HELP = `gitreqd bootstrap – initialize a directory with gitreqd project files

Usage: gitreqd bootstrap [options]

Creates gitreqd.yaml and a requirements folder in the target directory. Use --project-dir
to specify the directory (default: current directory). If gitreqd.yaml or requirements
already exists, use --force to overwrite the root file or to continue when the folder exists.

Options:
  -h, --help           Show this help
  --project-dir <dir>  Directory to bootstrap (default: current directory)
  --force              Overwrite existing gitreqd.yaml; do not fail if requirements folder exists
  --cursor-rules       Add .cursor rules for requirements (without prompting)
`;

const RESOLVE_CONFLICTS_HELP = `gitreqd resolve-conflicts – resolve merge conflicts in requirement files (GRD-GIT-002)

Usage: gitreqd resolve-conflicts [options]

Resolves Git merge conflicts in requirement YAML files under the project using the LLM
configured in gitreqd.yaml (ollama.base_url, ollama.model). Only requirement files
under requirement_dirs are processed. Resolved content is validated against the
requirement schema; on validation failure no changes are written.

Set GITREQD_LOG_LLM=1 to log LLM requests and responses to stderr.

Options:
  -h, --help           Show this help
  --project-dir <dir>  Project directory (default: current directory)
`;

const CLI_COMMANDS = [
  "validate",
  "html",
  "schema",
  "bootstrap",
  "resolve-conflicts",
] as const;

type CliCommand = (typeof CLI_COMMANDS)[number];

function parseCliCommand(args: string[]): CliCommand {
  for (const a of args) {
    if ((CLI_COMMANDS as readonly string[]).includes(a)) {
      return a as CliCommand;
    }
  }
  return "validate";
}

function parseArgs(argv: string[]): {
  command: CliCommand;
  projectDir: string;
  outputDir: string;
  schemaFormat: "json-schema" | "yaml";
  schemaOutputFile: string | undefined;
  showHelp: boolean;
  helpCommand: CliCommand | null;
  bootstrapForce: boolean;
  bootstrapCursorRules: boolean;
} {
  const args = argv.slice(2);
  const command = parseCliCommand(args);
  let projectDir = process.cwd();
  let outputDir = DEFAULT_OUTPUT_DIR;
  let schemaFormat: "json-schema" | "yaml" = "json-schema";
  let schemaOutputFile: string | undefined;
  let showHelp = false;
  let helpCommand: CliCommand | null = null;
  let bootstrapForce = false;
  let bootstrapCursorRules = false;

  const hasExplicitCommand = args.some((a) => (CLI_COMMANDS as readonly string[]).includes(a));

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      showHelp = true;
      helpCommand = hasExplicitCommand ? command : null;
    } else if ((CLI_COMMANDS as readonly string[]).includes(arg)) {
      continue;
    } else if (arg === "--project-dir" && args[i + 1]) {
      projectDir = path.resolve(args[++i]);
    } else if ((arg === "--output" || arg === "-o") && args[i + 1]) {
      const next = args[++i];
      if (command === "schema") {
        schemaOutputFile = path.resolve(next);
      } else {
        outputDir = next;
      }
    } else if (arg === "--format" && args[i + 1]) {
      const fmt = args[++i];
      if (fmt === "json-schema" || fmt === "yaml") {
        schemaFormat = fmt;
      }
    } else if (arg === "--force") {
      bootstrapForce = true;
    } else if (arg === "--cursor-rules") {
      bootstrapCursorRules = true;
    }
  }

  return {
    command,
    projectDir,
    outputDir,
    schemaFormat,
    schemaOutputFile,
    showHelp,
    helpCommand,
    bootstrapForce,
    bootstrapCursorRules,
  };
}

/** GRD-CLI-004: Resolve path to packaged .cursor/rules templates (for bootstrap --cursor-rules). */
function getBootstrapTemplateRulesDir(): string | null {
  try {
    const dir = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "templates",
      ".cursor",
      "rules"
    );
    return dir;
  } catch {
    return null;
  }
}

function askCursorRules(): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Add .cursor rules for requirements? (y/N) ", (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}

async function main(): Promise<number> {
  const {
    command,
    projectDir,
    outputDir,
    schemaFormat,
    schemaOutputFile,
    showHelp,
    helpCommand,
    bootstrapForce,
    bootstrapCursorRules,
  } = parseArgs(process.argv);

  if (showHelp) {
    if (helpCommand === "validate") {
      console.log(VALIDATE_HELP);
    } else if (helpCommand === "html") {
      console.log(HTML_HELP);
    } else if (helpCommand === "schema") {
      console.log(SCHEMA_HELP);
    } else if (helpCommand === "bootstrap") {
      console.log(BOOTSTRAP_HELP);
    } else if (helpCommand === "resolve-conflicts") {
      console.log(RESOLVE_CONFLICTS_HELP);
    } else {
      console.log(GENERAL_HELP);
    }
    return 0;
  }

  try {
    if (command === "validate") {
      const { success } = await runValidate(projectDir);
      return success ? 0 : 1;
    }
    if (command === "html") {
      const { success } = await runHtml(projectDir, outputDir);
      return success ? 0 : 1;
    }
    if (command === "schema") {
      const { success, error } = await runSchema(projectDir, {
        format: schemaFormat,
        outputFile: schemaOutputFile,
      });
      if (error) {
        console.error(error);
      }
      return success ? 0 : 1;
    }
    if (command === "bootstrap") {
      let cursorRules = bootstrapCursorRules;
      if (!cursorRules && process.stdin.isTTY) {
        cursorRules = await askCursorRules();
      }
      const templateRulesDir = getBootstrapTemplateRulesDir();
      const result = await runBootstrap(projectDir, {
        force: bootstrapForce,
        cursorRules,
        templateRulesDir: templateRulesDir ?? undefined,
      });
      if (!result.success) {
        console.error(result.error);
        return 1;
      }
      console.log(`Created: ${result.created.join(", ")}`);
      return 0;
    }
    if (command === "resolve-conflicts") {
      const { success, resolved, errors } = await runResolveConflicts(projectDir);
      for (const err of errors) {
        const location = err.line != null ? `${err.path}:${err.line}` : err.path;
        console.error(`${location}: ${err.message}`);
      }
      if (resolved.length > 0) {
        console.log(`Resolved ${resolved.length} file(s): ${resolved.join(", ")}`);
      }
      return success ? 0 : 1;
    }
  } catch (err) {
    console.error(err);
    return 1;
  }

  console.error(
    "Usage: gitreqd validate | html | schema | bootstrap | resolve-conflicts [--project-dir <dir>] [--output <path>]"
  );
  return 1;
}

main().then((code) => process.exit(code));
