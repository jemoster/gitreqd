//! GRD-CLI-001: CLI validate requirements.

use gitreqd_core::{discover_project_root_candidates, load_requirements, ROOT_MARKER_HINT};
use std::io::{self, Write};
use std::path::Path;

pub fn run_validate(project_dir: &Path) -> io::Result<bool> {
    let candidates = match discover_project_root_candidates(project_dir) {
        Ok(c) => c,
        Err(err) => {
            writeln!(io::stderr(), "{err}")?;
            return Ok(false);
        }
    };
    if candidates.is_empty() {
        writeln!(
            io::stderr(),
            "No project root found (missing {ROOT_MARKER_HINT}). Run from a directory that contains {ROOT_MARKER_HINT} or use --project-dir."
        )?;
        return Ok(false);
    }

    let root = &candidates[0];
    let result = match load_requirements(project_dir, Some(root)) {
        Ok(r) => r,
        Err(err) => {
            writeln!(io::stderr(), "{err}")?;
            return Ok(false);
        }
    };

    for err in &result.errors {
        if let Some(line) = err.line {
            writeln!(io::stderr(), "{}:{line}: {}", err.path, err.message)?;
        } else {
            writeln!(io::stderr(), "{}: {}", err.path, err.message)?;
        }
    }

    if !result.errors.is_empty() {
        return Ok(false);
    }

    writeln!(
        io::stdout(),
        "Validated {} requirement(s).",
        result.requirements.len()
    )?;
    Ok(true)
}
