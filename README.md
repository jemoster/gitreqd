# gitreqd

A requirements management CLI for repositories that store requirements as YAML files.

[![Tests](https://github.com/jemoster/gitreqd/actions/workflows/test.yml/badge.svg)](https://github.com/jemoster/gitreqd/actions/workflows/test.yml)

## Installation

Install the latest published release directly from GitHub assets:

```bash
npm install -g \
  "https://github.com/jemoster/gitreqd/releases/download/v0.2.0/gitreqd-core-0.1.0.tgz" \
  "https://github.com/jemoster/gitreqd/releases/download/v0.2.0/gitreqd-0.1.0.tgz"
```

## Quick Start

From your repository root:

```bash
gitreqd bootstrap
```

Run commands from the project root (where `gitreqd.yaml` or `gitreqd.yml` exists), or pass `--project-dir /path/to/project`.

## Cursor Workflow

Use Cursor chat commands to move from requirement text to implementation:

- `/require` helps draft or update requirement files in your `requirements/` directory.
- `/implement` helps generate code changes that satisfy selected requirements.

A common flow is: define/refine requirements with `/require`, then switch to `/implement` to build the related code changes.

## Core Commands

- `gitreqd bootstrap` - initialize `gitreqd.yaml` and `requirements/`.
- `gitreqd validate` - check requirement YAML against the active schema.
- `gitreqd format` - rewrite requirement YAML into canonical format.
- `gitreqd html` - generate a static HTML report.
- `gitreqd browser` - run a local web UI and JSON API for requirements.
- `gitreqd schema` - print or export the effective requirement schema.
- `gitreqd resolve-conflicts` - resolve requirement-file merge conflicts with optional LLM settings.

Use `gitreqd --help` or `gitreqd <command> --help` for full options.

## Requirement File Basics

Each requirement is one file ending in `.req.yml` or `.req.yaml`.

Required fields:

- `id` - stable identifier, usually matching the filename (without suffix).
- `title` - short requirement name.

Common optional fields:

- `description` - requirement text (Markdown supported in reports).
- `attributes` - metadata such as status, owner, or rationale.
- `links` - traceability links (for example `satisfies: OTHER-ID`).
- `parameters` - reusable named values for interpolation in string fields.

Parameter placeholders in strings:

- `{{ :name }}` for local requirement parameters.
- `{{ other_id:name }}` for cross-requirement parameters.
- `{{ "fixed text" }}` for a quoted literal.

## Optional Configuration

### `profile` in `gitreqd.yaml`

Choose how requirement YAML is interpreted and rendered. If omitted, `standard` is used.

### `llm` in `gitreqd.yaml`

Used by LLM-enabled commands such as `resolve-conflicts`.

- `provider: ollama` requires `model`; optional `base_url` (default `http://localhost:11434`).
- `provider: claude` requires `api_key_env`; optional `model` and `base_url`.

## Developer Documentation

Developer-focused material (workspace layout, building from source, packaging, extension distribution, and pre-commit setup) is now in `dev.md`.