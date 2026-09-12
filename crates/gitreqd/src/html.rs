//! GRD-CLI-002: CLI HTML report.
//! GRD-HTML-008: When running in a VS Code-derived environment, file paths become host-IDE links.

use gitreqd_core::{
    collect_rust_source_links, discover_project_root_candidates, load_active_profile,
    load_requirements, normalize_path, vscode_derived_uri_scheme, ArtifactLinkRenderOptions,
    IdeArtifactLinkContext, ROOT_MARKER_HINT,
};
use std::collections::HashSet;
use std::fs;
use std::io::{self, Write};
use std::path::Path;

pub fn run_html(project_dir: &Path, output_dir: &Path) -> io::Result<bool> {
    let scheme = vscode_derived_uri_scheme(|k| std::env::var(k).ok());
    run_html_with_ide_scheme(project_dir, output_dir, scheme.as_deref())
}

/// GRD-HTML-008: `ide_scheme` is the host IDE URI scheme when generating in a VS Code-derived environment.
#[gitreqd::implements("GRD-HTML-008")]
pub fn run_html_with_ide_scheme(
    project_dir: &Path,
    output_dir: &Path,
    ide_scheme: Option<&str>,
) -> io::Result<bool> {
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
    let known_ids: HashSet<String> = result.requirements.iter().map(|r| r.id.clone()).collect();
    // GRD-HTML-007: HTML consumes collected source-link records; this CLI command is the composition point.
    let source_links = match collect_rust_source_links(root, &known_ids) {
        Ok(links) => links,
        Err(err) => {
            writeln!(io::stderr(), "{err}")?;
            Vec::new()
        }
    };
    let artifact_links = ide_scheme.and_then(|scheme| {
        let scheme = scheme.trim();
        if scheme.is_empty() {
            return None;
        }
        let project_root = root
            .canonicalize()
            .unwrap_or_else(|_| {
                if root.is_absolute() {
                    root.clone()
                } else {
                    cwd.join(root)
                }
            })
            .to_string_lossy()
            .into_owned();
        Some(ArtifactLinkRenderOptions {
            ide: Some(IdeArtifactLinkContext {
                uri_scheme: scheme.to_string(),
                project_root,
            }),
            github: None,
        })
    });
    let html =
        profile.generate_full_html(&result.requirements, &source_links, artifact_links.as_ref());
    fs::write(&html_path, html)?;
    writeln!(
        io::stdout(),
        "Wrote {} ({} requirements).",
        html_path.display(),
        result.requirements.len()
    )?;
    Ok(true)
}
