# gitreqd Developer Guide

This page collects developer-focused documentation that was moved out of `README.md`.

## Current Components

- **CLI** - Discover requirements, validate schema, format requirement YAML, and generate static HTML reports. Run from a project root (`gitreqd.yaml` / `gitreqd.yml`) or pass `--project-dir`. The Rust `gitreqd` binary provides bootstrap, validate, format, html, and schema.
- **VS Code extension** - Navigate `satisfies` links, use Go to Definition on requirement IDs, preview requirements, and scaffold new requirements. The extension calls `@gitreqd/core`, a JS facade over the `gitreqd-core` WASM module.
- **Pre-commit hook** - Optional hook script under `scripts/` to run `gitreqd validate` on commit.

## Planned Consumers

Future integrations are tracked here until formal requirements are added:

- **GitHub CI** - Publish a GitHub Action or reusable workflow for requirement validation in pull requests.

## Project Layout

Workspace TypeScript packages:

- `packages/core` - `@gitreqd/core`: WASM JS facade (parse, validate, format, HTML) plus a thin Node filesystem adapter for desktop VS Code.
- `packages/vscode` - `gitreqd-vscode`: extension source and packaging.

Rust crates:

- `crates/gitreqd-core` - core engine (discovery, parse, validate, format, full and single-requirement HTML, schema export, source-link collection). Single-requirement HTML can optionally turn implementation and verification file paths into GitHub blob links when repository owner, name, commit, and project-root path are provided.
- `crates/gitreqd-wasm` - wasm-bindgen JSON ABI over `gitreqd-core` for JavaScript hosts.
- `crates/gitreqd-macros` - proc-macro attributes for tagging Rust items as source links.
- `crates/gitreqd` - `gitreqd` binary with bootstrap, validate, format, html, and schema.

Shared product data:

- `requirements/` - product requirements for gitreqd itself.
- `sample_projects/` - test data only.

## Build From Source

CLI (bootstrap, validate, format, html, schema):

```bash
cargo build --workspace
cargo test --workspace
cargo run -p gitreqd -- validate --project-dir sample_projects/basic
```

Install a local Rust binary onto PATH:

```bash
cargo install --path crates/gitreqd
```

Workspace npm scripts `validate`, `format`, `html`, and `bootstrap` invoke that same binary via `cargo run -p gitreqd`.

VS Code extension and WASM core facade:

The WASM module needs `wasm32-unknown-unknown` and `wasm-bindgen-cli` 0.2.100:

```bash
rustup target add wasm32-unknown-unknown
./scripts/install-wasm-bindgen.sh
npm install
npm run build
```

`npm run build` compiles `gitreqd-wasm` into `packages/core/wasm/` (gitignored) and copies the `.wasm` next to the VS Code extension bundle.

## Distribution

### CLI and core package

Build the `@gitreqd/core` npm tarball locally:

```bash
./scripts/package.sh
```

That writes `release/gitreqd-core-X.Y.Z.tgz` (the WASM JS facade used by the VS Code extension).

Build the Linux x86_64 native CLI binary locally:

```bash
./scripts/package-native-cli.sh
```

The script writes `release/gitreqd-linux-x86_64`. Copy it onto `PATH` (for example `/usr/local/bin/gitreqd`). Publishing a GitHub Release uploads this asset via the CLI release workflow. Pull request CI also uploads that binary as a downloadable Actions artifact.

Install a local CLI from source with `./scripts/install-gitreqd.sh` (`cargo install --path crates/gitreqd`).

For GitHub-based releases, branch artifact download, and how to dry-run packaging, use `release.md`.

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
- Ensure `gitreqd` is on `PATH` (for example via `cargo install --path crates/gitreqd` or a copied `gitreqd-linux-x86_64` binary).
