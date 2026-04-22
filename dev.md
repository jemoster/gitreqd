# gitreqd Developer Guide

This page collects developer-focused documentation that was moved out of `README.md`.

## Current Components

- **CLI** - Discover requirements, validate schema, and generate static HTML reports. Run from a project root (`gitreqd.yaml` / `gitreqd.yml`) or pass `--project-dir`.
- **Browser UI** - Local Next.js app (`packages/web`) with split-pane UI and JSON API (`gitreqd browser`).
- **VS Code extension** - Navigate `satisfies` links, use Go to Definition on requirement IDs, preview requirements, and scaffold new requirements.
- **Pre-commit hook** - Optional hook script under `scripts/` to run `gitreqd validate` on commit.

## Planned Consumers

Future integrations are tracked here until formal requirements are added:

- **GitHub CI** - Publish a GitHub Action or reusable workflow for requirement validation in pull requests.

## Project Layout

Workspace TypeScript packages:

- `packages/core` - `@gitreqd/core`: core engine (discovery, parse, validate, resolve).
- `packages/cli` - `gitreqd`: CLI package and `gitreqd` binary.
- `packages/browser-ui` - `@gitreqd/browser-ui`: shared React UI used by local browser and cloud surfaces.
- `packages/browser-server` - `@gitreqd/browser-server`: REST helpers and file-backed requirement loading.
- `packages/web` - `gitreqd-web`: local Next.js shell, API routes, and auth stub for `gitreqd browser`.
- `packages/vscode` - `gitreqd-vscode`: extension source and packaging.
- `requirements/` - product requirements for gitreqd itself.
- `sample_projects/` - test data only.

## Build From Source

From repo root:

```bash
npm install
npm run build
```

Then run:

- `node packages/cli/dist/index.js <command>`
- or workspace scripts such as `npm run validate -- --project-dir sample_projects/basic`

To link a local binary after building:

```bash
cd packages/cli
npm link
```

## Distribution

### CLI Packages

Build release tarballs locally:

```bash
./scripts/package.sh
```

Install from generated artifacts:

```bash
npm install -g ./release/*.tgz
```

For GitHub-based releases and the concise release checklist, use `release.md`.

### VS Code Extension

Publishing a GitHub Release triggers extension build and uploads a `.vsix` artifact. Install it in VS Code via **Extensions** -> **...** -> **Install from VSIX...**.

For local extension packaging details, see `packages/vscode/README.md`.

## Advanced CLI Usage

Specify a project explicitly:

```bash
gitreqd validate --project-dir /path/to/project
gitreqd format --project-dir /path/to/project
gitreqd html --project-dir /path/to/project --output ./out
gitreqd schema --project-dir /path/to/project --format yaml -o ./schema.yaml
```

Schema export:

```bash
gitreqd schema
gitreqd schema --format json-schema --output ./requirement.schema.json
```

## Pre-commit Hook

Install hook into a target repo:

```bash
./scripts/install-pre-commit.sh [REPO_DIR]
```

- `REPO_DIR` is optional; if omitted, the current git repo is used.
- The hook uses git root as project root unless `GITREQD_PROJECT_DIR` is set.
- Ensure `gitreqd` is on `PATH` (for example via `npm install -g gitreqd` or local link).
