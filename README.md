# gitreqd

A requirements management CLI for repositories that store requirements as YAML files.

[![Tests](https://github.com/jemoster/gitreqd/actions/workflows/test.yml/badge.svg)](https://github.com/jemoster/gitreqd/actions/workflows/test.yml)

## Installation

On Linux x86_64, download `gitreqd-linux-x86_64` from the GitHub Releases page, mark it executable, and place it on your `PATH`. Unreleased branch builds attach the same binary as a Tests workflow artifact.

To build from source:

```bash
cargo install --path crates/gitreqd
```

See `dev.md` for developer builds.

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
- `gitreqd html` - generate a static HTML report. When this command runs inside VS Code, Cursor, or another VS Code-based editor, file paths in the report become links that open in that editor.
- `gitreqd schema` - print or export the effective requirement schema.

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

The HTML report (Rust `gitreqd html`) lists matching source links on each requirement under the same headings as YAML artifacts:

- **Satisfied by** — YAML `satisfied_by` under **By comment**, `implements` tags under **Rust**
- **Verified by** — YAML `verified_by` under **By comment**, `verifies` tags under **Rust**

Each Rust entry shows the file path, the kind of language item, and the line range (for example `L10–L12`). A heading or origin group is omitted when that requirement has no matching items. In VS Code, Cursor, or another VS Code-based editor, those file paths (and the requirement source file) are links that open at the matching location.

A complete crate is in `sample_projects/rust`: a tiny temperature converter with `implements` on the library functions, `verifies` on the tests, YAML `satisfied_by` / `verified_by` artifacts, and instructions for generating the HTML report with the latest `gitreqd` release.

## Optional Configuration

### `requirement_dirs` in `gitreqd.yaml`

Bootstrap creates a `requirements/` folder and lists it under `requirement_dirs`. Each entry is a path relative to the project root; the tool collects every `*.req.yml` and `*.req.yaml` file under those directories (recursively), except under `node_modules`. Use a single entry of `.` to include the whole project tree from the root down.

### `profile` in `gitreqd.yaml`

Choose how requirement YAML is interpreted and rendered. If omitted, `standard` is used.

## Developer Documentation

Developer-focused material (workspace layout, building from source, packaging, extension distribution, and pre-commit setup) is now in `dev.md`.