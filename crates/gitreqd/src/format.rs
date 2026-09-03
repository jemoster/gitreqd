//! GRD-CLI-006: Format all requirement YAML files under the project root.

use gitreqd_core::{
    discover_project_root_candidates, format_project_requirement_files, ROOT_MARKER_HINT,
};
use std::io::{self, Write};
use std::path::Path;

/// Format every discovered requirement file in place. Returns true on success.
#[gitreqd::implements("GRD-CLI-006")]
pub fn run_format(project_dir: &Path) -> io::Result<bool> {
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

    let result = format_project_requirement_files(project_dir);

    for err in &result.errors {
        if let Some(line) = err.line {
            writeln!(io::stderr(), "{}:{line}: {}", err.path, err.message)?;
        } else {
            writeln!(io::stderr(), "{}: {}", err.path, err.message)?;
        }
    }

    if !result.success {
        return Ok(false);
    }

    writeln!(
        io::stdout(),
        "Formatted {} file(s), left unchanged {} file(s) (already canonical).",
        result.written_paths.len(),
        result.skipped_paths.len()
    )?;
    Ok(true)
}
