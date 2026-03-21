# gitreqd

A requirement management tool that works with requirement files stored in your repo.

[![Tests](https://github.com/jemoster/gitreqd/actions/workflows/test.yml/badge.svg)](https://github.com/jemoster/gitreqd/actions/workflows/test.yml)

## Current

- **CLI** – Discover requirements, validate schema, and generate static HTML reports. Run from the project root (where `root.gitreqd` is present) or pass `--project-dir`. Use `gitreqd bootstrap` to initialize a directory with `root.gitreqd` and a `requirements` folder.

## Planned consumers

Future integrations are described here; formal product requirements will be added when we start building them.

- **VSCode extension** – Validation, outline, and navigation of requirement files inside the editor.
- **Web portal** – Browse and search requirements via a web app that uses the same core API.
- **GitHub CI** – Action or workflow step to validate requirements and enforce status checks (e.g. required approvals) on PRs.

## Project layout

Workspace with two TypeScript packages:

- `packages/core` – **@gitreqd/core**: Core engine (discovery, parse, validate, resolve). Consumer-agnostic; no CLI dependencies.
- `packages/cli` – **gitreqd**: CLI that depends on core. Provides the `gitreqd` binary.
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

This creates `root.gitreqd` and a `requirements` folder. If either already exists, use `--force` to overwrite the root file or to continue when the folder is present. Use `--cursor-rules` to add Cursor editor rules for the requirements directory; otherwise you are prompted when running interactively.

### Validating and reporting

From a directory that contains (or is below) a `root.gitreqd` marker:

```bash
# Validate requirement YAML under the project root
npx gitreqd validate

# Generate HTML report (default output: ./index.html in the current directory)
npx gitreqd html [--output dir]
```

Specify a project directory explicitly:

```bash
npx gitreqd validate --project-dir /path/to/project
npx gitreqd html --project-dir /path/to/project --output ./out
```

From the workspace after `npm run build`:

```bash
npm run validate -- --project-dir sample_projects/basic
npm run html -- --project-dir sample_projects/basic --output ./out
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

Text fields in requirement YAML support template syntax (GRD-SYS-005, GRD-SYS-006): `{{ :parameter_name }}` for local parameters, `{{ requirement_id:parameter_name }}` for cross-requirement references, and `{{ "literal" }}` or `{{ 'literal' }}` for literal strings that are not processed.