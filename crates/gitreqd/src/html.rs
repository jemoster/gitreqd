//! GRD-CLI-002: CLI HTML report.

use gitreqd_core::{
    discover_project_root_candidates, load_active_profile, load_requirements, normalize_path,
    ROOT_MARKER_HINT,
};
use std::fs;
use std::io::{self, Write};
use std::path::Path;

pub fn run_html(project_dir: &Path, output_dir: &Path) -> io::Result<bool> {
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
    let profile = match load_active_profile(root) {
        Ok(p) => p,
        Err(err) => {
            writeln!(io::stderr(), "{err}")?;
            return Ok(false);
        }
    };
    let result = match load_requirements(project_dir, Some(root)) {
        Ok(r) => r,
        Err(err) => {
            writeln!(io::stderr(), "{err}")?;
            return Ok(false);
        }
    };

    if !result.errors.is_empty() {
        for err in &result.errors {
            writeln!(io::stderr(), "{}: {}", err.path, err.message)?;
        }
        writeln!(
            io::stderr(),
            "Validation failed; fix errors before generating HTML."
        )?;
        return Ok(false);
    }

    let cwd = std::env::current_dir()?;
    let out_dir = if output_dir.is_absolute() {
        output_dir.to_path_buf()
    } else {
        cwd.join(output_dir)
    };
    let out_dir = normalize_path(&out_dir);
    fs::create_dir_all(&out_dir)?;
    let html_path = normalize_path(&out_dir.join("index.html"));
    let html = profile.generate_full_html(&result.requirements);
    fs::write(&html_path, html)?;
    writeln!(
        io::stdout(),
        "Wrote {} ({} requirements).",
        html_path.display(),
        result.requirements.len()
    )?;
    Ok(true)
}
