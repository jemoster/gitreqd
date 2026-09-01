# gitreqd product requirements

Product requirements for the gitreqd requirement management tool are stored here.

## Numbering

- **GRD-SYS-*** – System / platform (core engine, discovery, schema).
- **GRD-CLI-*** – CLI behavior. Essential commands: bootstrap, validate, html, schema.
- **GRD-VSC-*** – VSCode plugin (IDE integration, link following).
- **GRD-DEVOPS-*** – DevOps / CI (GitHub Actions, tests on PRs).

Add new categories as needed (e.g. GRD-WEB-*) when you add formal requirements for other consumers.

## Essential CLI

The essential CLI commands are `bootstrap`, `validate`, `html`, and `schema` (GRD-CLI-004, GRD-CLI-001, GRD-CLI-002, GRD-CLI-005), with project root discovery (GRD-CLI-003). GRD-CLI-008 names that set. These requirements do not depend on TypeScript, Node.js, or npm.

Additional CLI capabilities such as `format` (GRD-CLI-006), npm distribution (GRD-CLI-007), and `resolve-conflicts` (GRD-GIT-002) are specified separately and are not required of every CLI implementation.

## Adding requirements

- One YAML file per requirement.
- File name should match the requirement id (e.g. `GRD-SYS-001.req.yml` or `GRD-SYS-001.req.yaml`).
- Use the same schema as project requirements: `id`, `title`, `require`, `refinement`, `attributes`, `links`, `satisfied_by`, `verified_by`.
- In `links`, use `satisfies: <id>` to reference other requirements (e.g. `satisfies: GRD-SYS-001`).
