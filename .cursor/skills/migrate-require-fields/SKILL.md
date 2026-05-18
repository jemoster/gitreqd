---
name: migrate-require-fields
description: >-
  Migrate gitreqd requirement YAML from legacy description to require + refinement.
  Use when converting .req.yml files to the new schema or fixing migration flags.
disable-model-invocation: true
---

# Migrate requirement fields (description → require + refinement)

## When to use

- Project still has `description` on requirement files (legacy schema).
- User asks to migrate, restructure, or adopt `require` / `refinement`.

## CLI

From the project root (directory containing `gitreqd.yaml`):

```bash
gitreqd migrate --dry-run
gitreqd migrate --write
```

- Default is dry-run: lists files that would change and flags ambiguous results.
- `--write` rewrites files and applies canonical formatting.
- Exit code is non-zero when any file is flagged for manual review.

## Heuristic

For each legacy `description`:

1. First paragraph/sentence containing `shall`, else `should`, else `may` → `require`.
2. Remaining text → `refinement` (omitted if empty).

## Manual fixes

Review dry-run output when flagged:

- `empty_description` — add a `require` statement with one normative keyword.
- `no_rfc2119_keyword` — `require` must contain exactly one of shall / should / may.
- `multiple_rfc2119_in_require` — shorten `require` to a single normative sentence; move extra constraints to `refinement`.

## Authoring new requirements

```yaml
id: EX-001
title: Short title
require: The system shall do one clear thing for this ID.
refinement: |
  Optional bullets, examples, and secondary detail (Markdown in reports).
```

- `require`: one Shall, Should, or May statement only.
- `refinement`: everything else.
