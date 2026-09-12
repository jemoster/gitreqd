//! GRD-CLI-002: CLI HTML report.
//! GRD-HTML-008: When `origin` is GitHub, file paths become blob links at HEAD.

use gitreqd_core::{
    collect_rust_source_links, discover_project_root_candidates, github_project_root_rel,
    load_active_profile, load_requirements, normalize_path, parse_github_origin_url,
    ArtifactLinkRenderOptions, GithubArtifactLinkContext, ROOT_MARKER_HINT,
};
use std::collections::HashSet;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::Command;

pub fn run_html(project_dir: &Path, output_dir: &Path) -> io::Result<bool> {
    run_html_with_github(project_dir, output_dir, discover_github_link_context)
}

/// GRD-HTML-008: Injected GitHub context for tests; production uses origin/HEAD discovery.
#[gitreqd::implements("GRD-HTML-008")]
pub fn run_html_with_github<F>(
    project_dir: &Path,
    output_dir: &Path,
    discover: F,
) -> io::Result<bool>
where
    F: Fn(&Path) -> Option<GithubArtifactLinkContext>,
{
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
    let github = discover(root);
    let artifact_links = github.as_ref().map(|ctx| ArtifactLinkRenderOptions {
        github: Some(ctx.clone()),
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
    if let Some(ctx) = github.as_ref() {
        writeln!(
            io::stdout(),
            "GitHub file links: https://{}/{}/{}/blob/{}/…",
            ctx.github_host(),
            ctx.owner,
            ctx.repo,
            ctx.commit_sha
        )?;
    }
    Ok(true)
}

fn git_stdout(cwd: &Path, args: &[&str]) -> Option<String> {
    let out = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let text = String::from_utf8(out.stdout).ok()?;
    let trimmed = text.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

/// GRD-HTML-008: Resolve GitHub blob context from `origin` and `HEAD`.
#[gitreqd::implements("GRD-HTML-008")]
pub fn discover_github_link_context(project_root: &Path) -> Option<GithubArtifactLinkContext> {
    let toplevel = git_stdout(project_root, &["rev-parse", "--show-toplevel"])?;
    let origin = git_stdout(project_root, &["remote", "get-url", "origin"])?;
    let head = git_stdout(project_root, &["rev-parse", "HEAD"])?;
    let parsed = parse_github_origin_url(&origin)?;
    let project_abs = project_root
        .canonicalize()
        .unwrap_or_else(|_| {
            if project_root.is_absolute() {
                project_root.to_path_buf()
            } else {
                std::env::current_dir()
                    .map(|cwd| cwd.join(project_root))
                    .unwrap_or_else(|_| project_root.to_path_buf())
            }
        })
        .to_string_lossy()
        .replace('\\', "/");
    let top_abs = PathBuf::from(&toplevel)
        .canonicalize()
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .unwrap_or_else(|_| toplevel.replace('\\', "/"));
    Some(GithubArtifactLinkContext {
        host: parsed.host,
        owner: parsed.owner,
        repo: parsed.repo,
        commit_sha: head,
        project_root_rel: github_project_root_rel(&top_abs, &project_abs),
        project_root: project_abs,
    })
}
