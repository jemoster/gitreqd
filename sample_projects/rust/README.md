# Rust tracing sample

A small Celsius/Fahrenheit library that shows how gitreqd collects **implementation** and **verification** links from Rust source and prints them in the HTML report.

Requirements live in `requirements/`. Implementation is tagged with `#[gitreqd::implements("…")]`. Tests that assert those requirements are tagged with `#[gitreqd::verifies("…")]`.

## Latest gitreqd release

This sample is meant to be used with the latest `gitreqd` CLI from [GitHub Releases](https://github.com/jemoster/gitreqd/releases/latest). On Linux x86_64:

```bash
curl -L -o gitreqd "https://github.com/jemoster/gitreqd/releases/latest/download/gitreqd-linux-x86_64"
chmod +x gitreqd
```

Place `gitreqd` on your `PATH`, or invoke it with `./gitreqd` from the download directory.

From this repository you can also run the same CLI from source:

```bash
cargo run -p gitreqd -- html --project-dir sample_projects/rust --output ./out
```

The `gitreqd-macros` crate is a path dependency on this workspace (same macros the latest release collects). In your own project, pin the macros crate to that release:

```toml
gitreqd-macros = { git = "https://github.com/jemoster/gitreqd", tag = "v0.5.0" }
```

## Run the tests

From the repository root:

```bash
cargo test -p tempconv
```

Or from this directory:

```bash
cargo test
```

## Generate the HTML report

From this directory, after `gitreqd` is on `PATH`:

```bash
gitreqd html --output ./out
```

Open `out/index.html`. Each requirement includes:

- **Satisfied by** — YAML `satisfied_by` artifact paths
- **Implemented by** — `#[gitreqd::implements]` on `celsius_to_fahrenheit` / `fahrenheit_to_celsius`
- **Verified by** — YAML `verified_by` plus `#[gitreqd::verifies]` on the unit tests (including the round-trip test that lists both IDs)
