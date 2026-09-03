# gitreqd

A requirements management CLI for repositories that store requirements as YAML files.

[![Tests](https://github.com/jemoster/gitreqd/actions/workflows/test.yml/badge.svg)](https://github.com/jemoster/gitreqd/actions/workflows/test.yml)

## Installation

Install the latest published release directly from GitHub assets:

```bash
npm install -g \
  "https://github.com/jemoster/gitreqd/releases/download/v0.4.0/gitreqd-core-0.4.0.tgz" \
  "https://github.com/jemoster/gitreqd/releases/download/v0.4.0/gitreqd-0.4.0.tgz"
```

A Rust implementation of the essential commands (`bootstrap`, `validate`, `html`, `schema`) is also in this repository.

On Linux x86_64, download `gitreqd-linux-x86_64` from the GitHub Releases page, mark it executable, and place it on your `PATH`. Unreleased branch builds attach the same binary as a Tests workflow artifact. To build from source instead:

```bash
cargo install --path crates/gitreqd
```

See `dev.md` for building from source.

## Quick Start

From your repository root:

```bash
gitreqd bootstrap
```

Run commands from the project root (where `gitreqd.yaml` or `gitreqd.yml` exists), or pass `--project-dir /path/to/project`.

## Cursor Workflow

Use Cursor [Agent Skills](https://cursor.com/docs/context/skills) in `.cursor/skills/` to move from requirement text to implementation:

- `/require` helps draft or update requirement files in your `requirements/` directory.
- `/implement` helps generate code changes that satisfy selected requirements.

A common flow is: define/refine requirements with `/require`, then switch to `/implement` to build the related code changes.

## Core Commands

- `gitreqd bootstrap` - initialize `gitreqd.yaml` and `requirements/`.
- `gitreqd validate` - check requirement YAML against the active schema.
- `gitreqd format` - rewrite requirement YAML into canonical format.
- `gitreqd html` - generate a static HTML report.
- `gitreqd schema` - print or export the effective requirement schema.
- `gitreqd resolve-conflicts` - resolve requirement-file merge conflicts with optional LLM settings.

Use `gitreqd --help` or `gitreqd <command> --help` for full options.

## Requirement File Basics

Each requirement is one file ending in `.req.yml` or `.req.yaml`.

Required fields:

- `id` - stable identifier, usually matching the filename (without suffix).
- `title` - short requirement name.

Required normative field:

- `require` - single Shall, Should, or May statement for this requirement ID.

Common optional fields:

- `refinement` - supporting detail (Markdown supported in reports).
- `attributes` - metadata such as status, owner, or rationale.
- `links` - traceability links (for example `satisfies: OTHER-ID`).
- `satisfied_by` - artifacts (file paths or URLs) that implement or satisfy the requirement, each with an optional description.
- `verified_by` - artifacts (file paths or URLs) that verify the requirement was met, each with an optional description.
- `parameters` - reusable named values for interpolation in string fields.

Example artifact entry:

```yaml
satisfied_by:
  - artifact: src/feature.ts
    description: Primary implementation.
verified_by:
  - artifact: test/feature.test.ts
```

Parameter placeholders in strings:

- `{{ :name }}` for local requirement parameters.
- `{{ other_id:name }}` for cross-requirement parameters.
- `{{ "fixed text" }}` for a quoted literal.

## Tracing Rust source

Tag implementation and test items so gitreqd can collect source links. Add the `gitreqd-macros` crate and alias it as `gitreqd`, then attach the attributes:

```rust
extern crate gitreqd_macros as gitreqd;

#[gitreqd::implements("REQ-001")]
pub fn render_report() {}

#[gitreqd::verifies("REQ-001")]
#[test]
fn report_contains_index() {}
```

`implements` marks implementation; `verifies` marks verification. Each attribute accepts one or more requirement ID strings. `#[gitreqd_macros::implements]` / `#[gitreqd_macros::verifies]` are equivalent without the alias.

The HTML report (Rust `gitreqd html`) lists matching source links on each requirement:

- **Implemented by** for `implements` tags
- **Verified by** for `verifies` tags, in the same list as any YAML `verified_by` artifacts

Each entry shows the file path, the kind of language item, and the line range (for example `L10–L12`). A heading is omitted when that requirement has no matching links.

## Optional Configuration

### `requirement_dirs` in `gitreqd.yaml`

Bootstrap creates a `requirements/` folder and lists it under `requirement_dirs`. Each entry is a path relative to the project root; the tool collects every `*.req.yml` and `*.req.yaml` file under those directories (recursively), except under `node_modules`. Use a single entry of `.` to include the whole project tree from the root down.

### `profile` in `gitreqd.yaml`

Choose how requirement YAML is interpreted and rendered. If omitted, `standard` is used.

### `llm` in `gitreqd.yaml`

Used by LLM-enabled commands such as `resolve-conflicts`.

- `provider: ollama` requires `model`; optional `base_url` (default `http://localhost:11434`).
- `provider: claude` requires `api_key_env`; optional `model` and `base_url`.

## Developer Documentation

Developer-focused material (workspace layout, building from source, packaging, extension distribution, and pre-commit setup) is now in `dev.md`.