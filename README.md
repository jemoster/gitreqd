# gitreqd

A requirement management tool that works with requirement files stored in your repo.
## Current

- **CLI** – Discover requirements, validate schema, and generate static HTML reports. Run from the project root (where `root.gitreqd` is present) or pass `--project-dir`.

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

## Usage

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

python3 -m http.server 80 --directory /home/dev/src/Theia/gitreqd/out

## Requirement file format

Text fields in requirement YAML support template syntax (GRD-SYS-005, GRD-SYS-006): `{{ :parameter_name }}` for local parameters, `{{ requirement_id:parameter_name }}` for cross-requirement references, and `{{ "literal" }}` or `{{ 'literal' }}` for literal strings that are not processed.