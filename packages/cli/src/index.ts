#!/usr/bin/env node

import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { runValidate } from "./validate-cmd.js";
import { runHtml } from "./html-cmd.js";
import { runResolveConflicts } from "./resolve-conflicts-cmd.js";
import { runBootstrap } from "./bootstrap-cmd.js";

const DEFAULT_OUTPUT_DIR = ".";

const GENERAL_HELP = `gitreqd – requirement discovery and validation

Usage: gitreqd <command> [options]

Commands:
  validate          Check requirement files for schema, duplicate IDs, and broken links
  html              Generate an HTML report of all requirements
  bootstrap         Initialize a directory with root.gitreqd and a requirements folder
  resolve-conflicts Resolve merge conflicts in requirement files using LLM (GRD-GIT-002)

Options (global):
  -h, --help           Show this help or command-specific help
  --project-dir <dir>  Project directory (default: current directory)

Run 'gitreqd <command> --help' for command-specific options.
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

Creates root.gitreqd and a requirements folder in the target directory. Use --project-dir
to specify the directory (default: current directory). If root.gitreqd or requirements
already exists, use --force to overwrite the root file or to continue when the folder exists.

Options:
  -h, --help           Show this help
  --project-dir <dir>  Directory to bootstrap (default: current directory)
  --force              Overwrite existing root.gitreqd; do not fail if requirements folder exists
  --cursor-rules       Add .cursor rules for requirements (without prompting)
`;

const RESOLVE_CONFLICTS_HELP = `gitreqd resolve-conflicts – resolve merge conflicts in requirement files (GRD-GIT-002)

Usage: gitreqd resolve-conflicts [options]

Resolves Git merge conflicts in requirement YAML files under the project using the LLM
configured in root.gitreqd (ollama.base_url, ollama.model). Only requirement files
under requirement_dirs are processed. Resolved content is validated against the
requirement schema; on validation failure no changes are written.

Set GITREQD_LOG_LLM=1 to log LLM requests and responses to stderr.

Options:
  -h, --help           Show this help
  --project-dir <dir>  Project directory (default: current directory)
`;

function parseArgs(argv: string[]): {
  command: "validate" | "html" | "bootstrap" | "resolve-conflicts";
  projectDir: string;
  outputDir: string;
  showHelp: boolean;
  helpCommand: "validate" | "html" | "bootstrap" | "resolve-conflicts" | null;
  bootstrapForce: boolean;
  bootstrapCursorRules: boolean;
} {
  const args = argv.slice(2);
  let command: "validate" | "html" | "bootstrap" | "resolve-conflicts" = "validate";
  let projectDir = process.cwd();
  let outputDir = DEFAULT_OUTPUT_DIR;
  let showHelp = false;
  let helpCommand: "validate" | "html" | "bootstrap" | "resolve-conflicts" | null = null;
  let bootstrapForce = false;
  let bootstrapCursorRules = false;

  const hasExplicitCommand = args.some(
    (a) => a === "validate" || a === "html" || a === "bootstrap" || a === "resolve-conflicts"
  );

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      showHelp = true;
      helpCommand = hasExplicitCommand ? command : null;
    } else if (arg === "validate" || arg === "html" || arg === "bootstrap" || arg === "resolve-conflicts") {
      command = arg;
    } else if (arg === "--project-dir" && args[i + 1]) {
      projectDir = path.resolve(args[++i]);
    } else if ((arg === "--output" || arg === "-o") && args[i + 1]) {
      outputDir = args[++i];
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
    "Usage: gitreqd validate | html | bootstrap | resolve-conflicts [--project-dir <dir>] [--output <dir>]"
  );
  return 1;
}

main().then((code) => process.exit(code));
