# gitreqd product requirements

Product requirements for the gitreqd requirement management tool are stored here.

## Numbering

- **GRD-SYS-*** – Core engine behavior (discovery, parse, schema, profiles). Language-agnostic unless noted.
- **GRD-VALID-*** – Validation rules. Language-agnostic.
- **GRD-HTML-*** – HTML report content. Language-agnostic.
- **GRD-CLI-*** – Command-line interface. Essential commands (`bootstrap`, `validate`, `html`, `schema`) are language-agnostic. Additional commands and npm distribution are not required of every implementation.
- **GRD-TS-*** – TypeScript implementation (in-process library API, Zod schema encoding).
- **GRD-VSC-*** – VSCode plugin (IDE integration, link following).
- **GRD-GIT-*** – Git extras (diff, merge-conflict resolution, pre-commit).
- **GRD-DEVOPS-*** – DevOps / CI (GitHub Actions, tests on PRs).

Add new categories as needed (e.g. GRD-WEB-* or GRD-RUST-*) when you add formal requirements for other consumers or implementations.

## Essential CLI (implementation-independent)

The essential CLI is the command-line contract a future Rust application should implement. It is defined by observable command names, options, inputs, outputs, and exit status — not by TypeScript, Node.js, npm, or a TypeScript in-process API.

A complete essential CLI shall satisfy **GRD-CLI-008** and the requirements that GRD-CLI-008 and the four essential commands depend on:

- **Command set and process contract:** GRD-CLI-008
- **Commands:** GRD-CLI-001 (`validate`), GRD-CLI-002 (`html`), GRD-CLI-003 (project root discovery), GRD-CLI-004 (`bootstrap`), GRD-CLI-005 (`schema`)
- **Core capabilities:** GRD-SYS-001, GRD-SYS-002, GRD-SYS-003, GRD-SYS-004, GRD-SYS-005, GRD-SYS-006, GRD-SYS-007, GRD-SYS-009, GRD-SYS-010, GRD-SYS-015, GRD-SYS-016
- **Validation rules:** GRD-VALID-001, GRD-VALID-002, GRD-VALID-003, GRD-VALID-004, GRD-VALID-005
- **HTML report:** GRD-HTML-001, GRD-HTML-002, GRD-HTML-003, GRD-HTML-004, GRD-HTML-005, GRD-HTML-006

An essential CLI implementation is not required to satisfy:

- TypeScript-only requirements (GRD-TS-*, GRD-CLI-007 npm distribution, GRD-VSC-*, npm-based GRD-DEVOPS-001)
- Additional CLI commands (GRD-CLI-006 `format`, GRD-GIT-002 `resolve-conflicts`)
- YAML formatter internals (GRD-SYS-011) or LLM provider configuration (GRD-SYS-012, GRD-SYS-013, GRD-SYS-014), except as needed by those additional commands

When defining a Rust (or other language) implementation, add implementation-specific requirements (for example GRD-RUST-*) that **satisfy** GRD-CLI-008. Do not duplicate the behavioral requirements.

The current TypeScript packages implement a **superset**: the essential CLI plus `format`, `resolve-conflicts`, the VSCode extension, and npm distribution.

## Adding requirements

- One YAML file per requirement.
- File name should match the requirement id (e.g. `GRD-SYS-001.req.yml` or `GRD-SYS-001.req.yaml`).
- Use the same schema as project requirements: `id`, `title`, `require`, `refinement`, `attributes`, `links`, `satisfied_by`, `verified_by`.
- In `attributes`, use the existing keys `status` and `rationale`.
- In `links`, use `satisfies: <id>` to reference other requirements (e.g. `satisfies: GRD-SYS-001`).
