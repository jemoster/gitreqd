# gitreqd

A requirement management tool that works with requirement files stored in your repo.

[![Tests](https://github.com/jemoster/gitreqd/actions/workflows/test.yml/badge.svg)](https://github.com/jemoster/gitreqd/actions/workflows/test.yml)

## Current

- **CLI** – Discover requirements, validate schema, and generate static HTML reports. Run from the project root (where `gitreqd.yaml` or `gitreqd.yml` is present) or pass `--project-dir`. Requirement files use the `.req.yml` or `.req.yaml` suffix. Use `gitreqd bootstrap` to initialize a directory with `gitreqd.yaml` and a `requirements` folder.
- **Browser UI** – Start a local server.
- **VS Code extension** – Navigate `satisfies` links and use Go to Definition on requirement ids; JSON Schema validation for `.req.yml` / `.req.yaml` (via the Red Hat YAML extension); requirement preview and “add new requirement” commands. Built as `packages/vscode`, shipped as a `.vsix` (see **Distribution** below).
- **Pre-commit hook** – Repositories can install the script under `scripts/` so commits run `gitreqd validate` against the project (see **Pre-commit hook** below).

## Planned consumers

Future integrations are described here; formal product requirements will be added when we start building them.

- **GitHub CI** – Published GitHub Action or reusable workflow so repositories can validate requirements and gate pull requests without hand-writing steps (this repo’s own CI builds and tests the tool; it does not yet ship a consumer-facing Action).

## Project layout

Workspace with three TypeScript packages:

- `packages/core` – **@gitreqd/core**: Core engine (discovery, parse, validate, resolve). Consumer-agnostic; no CLI dependencies.
- `packages/cli` – **gitreqd**: CLI that depends on core. Provides the `gitreqd` binary.
- `packages/vscode` – **gitreqd-vscode**: Editor extension bundled with core; see `packages/vscode/README.md`.
- `requirements/` – Product requirements for gitreqd itself (GRD-*).
- `sample_projects/` – Test data only; not part of the product.

## Build

From the repo root:

```bash
npm install
npm run build
```

Then run the CLI via `node packages/cli/dist/index.js` or use the workspace scripts (see below). To use the `gitreqd` binary locally, run `npm link` from `packages/cli` after building.

## Distribution

### CLI (npm packages)

To build and package the tool for installation on a host (so multiple repositories can use the same installation):

```bash
./scripts/package.sh
```

This produces a `release/` directory containing installable `.tgz` artifacts. To install from that directory:
```bash
npm install -g ./release/*.tgz
```

### VS Code extension

When you publish a [GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository), the release workflow builds the extension into a `.vsix` and uploads it to that release. Download the `.vsix` from the release’s assets, then in VS Code use **Extensions** → **⋯** → **Install from VSIX...** and select the file. To build a `.vsix` locally instead, see `packages/vscode/README.md`.

## Usage

### Bootstrapping a new project

To create the basic gitreqd layout in the current directory (or a given path):

```bash
npx gitreqd bootstrap [--project-dir /path/to/dir] [--force] [--cursor-rules]
```

This creates `gitreqd.yaml` and a `requirements` folder. If either already exists, use `--force` to overwrite the root file or to continue when the folder is present. Use `--cursor-rules` to add Cursor editor rules for the requirements directory; otherwise you are prompted when running interactively.

### Project profile (optional)

The root file may include an optional `profile` key. The active profile controls how requirement YAML is interpreted, validated, and rendered in HTML reports. Only one profile applies per project. If you omit `profile`, the tool uses the built-in `standard` profile. Future releases may add more profiles for different document shapes or reporting rules.

### LLM configuration (optional)

Commands that call an external language model (for example merge-conflict resolution) read settings from an `llm` mapping in `gitreqd.yaml` / `gitreqd.yml`. Set `llm.provider` to choose a backend:

- **`ollama`** — Local Ollama server. Required: `model` (must exist on the server). Optional: `base_url` (defaults to `http://localhost:11434`). Before running, the tool checks that the server responds and lists the configured model.
- **`claude`** — Anthropic’s API. Required: `api_key_env` (name of an environment variable whose value is the API key; the key is never read from the YAML file). Optional: `model` (defaults to `claude-sonnet-4-20250514`, a current Claude Sonnet 4 snapshot on the Anthropic API), `base_url` (defaults to `https://api.anthropic.com` for enterprise proxies or compatible endpoints).

Unknown keys under `llm` may produce warnings but are ignored so newer fields can be added without breaking older clients. Use `gitreqd resolve-conflicts` (from the project root) to resolve Git conflict markers in requirement YAML using that configuration.

### Validating and reporting

From a directory that contains (or is below) a `gitreqd.yaml` or `gitreqd.yml` marker:

```bash
# Validate requirement YAML under the project root
npx gitreqd validate

# Rewrite all requirement files to canonical YAML (field order, indentation, line endings)
npx gitreqd format

# Generate HTML report (default output: ./index.html in the current directory)
npx gitreqd html [--output dir]

# Run local browser UI + REST API (default: http://127.0.0.1:3210)
npx gitreqd browser [--port 3210]

# Print the effective requirement schema (JSON Schema by default; use --format yaml for YAML)
npx gitreqd schema
npx gitreqd schema --format json-schema --output ./requirement.schema.json
```

Specify a project directory explicitly:

```bash
npx gitreqd validate --project-dir /path/to/project
npx gitreqd format --project-dir /path/to/project
npx gitreqd html --project-dir /path/to/project --output ./out
npx gitreqd schema --project-dir /path/to/project --format yaml -o ./schema.yaml
```

From the workspace after `npm run build`:

```bash
npm run validate -- --project-dir sample_projects/basic
node packages/cli/dist/index.js format --project-dir sample_projects/basic
npm run html -- --project-dir sample_projects/basic --output ./out
node packages/cli/dist/index.js schema --project-dir sample_projects/basic
```

### Pre-commit hook

A pre-commit hook runs `gitreqd validate` so invalid requirement YAML is not committed. Install it into your repo:

```bash
./scripts/install-pre-commit.sh [REPO_DIR]
```

- **REPO_DIR** (optional): path to the git repository. If omitted, the repository containing the current working directory is used.
- The hook uses the git repository root as the project directory unless `GITREQD_PROJECT_DIR` is set.
- Ensure `gitreqd` is on your PATH (e.g. run `./scripts/install-gitreqd.sh` to build and link from source, or run `./scripts/package.sh` then `./scripts/install-gitreqd.sh ./release` to install from the packaged artifact).

## Requirement file format

Each requirement lives in **one YAML file** whose name ends with **`.req.yml`** or **`.req.yaml`**. The **`id`** in the file should match the filename (without that suffix). The project’s `gitreqd.yaml` / `gitreqd.yml` lists which directories are searched for these files (`requirement_dirs`).

Every file must include:

- **`id`** – Stable identifier (for example `GRD-FEATURE-001`).
- **`title`** – Short label for the requirement.

You will usually also add:

- **`description`** – Full text of the requirement. Reports can render this as Markdown.
- **`attributes`** – Optional key–value metadata (for example `status` and `rationale`) for your own process.
- **`links`** – A list of link objects. Use **`satisfies: <other-id>`** when this requirement implements or traces to another requirement.
- **`parameters`** – Named values (string, number, or boolean) you can reference from the text of **`description`** and other string fields so shared values stay in one place.

In string fields, you can use **parameter placeholders**: `{{ :name }}` for a parameter defined on the same requirement, `{{ other_id:name }}` to pull a parameter from another requirement, and quoted literals such as `{{ "fixed text" }}` when the text should not be treated as a parameter reference.

With the gitreqd VS Code extension and a YAML language extension installed, editors typically offer validation and completion for these fields while you edit `.req.yml` / `.req.yaml` files under your configured requirement directories.