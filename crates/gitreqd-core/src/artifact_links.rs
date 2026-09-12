//! Optional context for rendering file-path hyperlinks in requirement HTML.
//! GRD-UI-009: GitHub blob URLs for satisfied_by / verified_by artifacts.
//! GRD-HTML-008: Host-IDE URLs when generating HTML in a VS Code-derived environment.

/// GitHub repository location used to build blob URLs for project-relative artifact paths.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GithubArtifactLinkContext {
    pub owner: String,
    pub repo: String,
    pub commit_sha: String,
    /// Repository-relative posix path to the gitreqd project root (may be empty).
    pub project_root_rel: String,
}

/// Host IDE used to build `scheme://file/...` URLs for presented file paths.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IdeArtifactLinkContext {
    /// URI scheme of the host IDE (`vscode`, `cursor`, `vscode-insiders`, …).
    pub uri_scheme: String,
    /// Absolute filesystem path of the gitreqd project root.
    pub project_root: String,
}

/// Optional context for rendering artifact hyperlinks in requirement HTML.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ArtifactLinkRenderOptions {
    pub github: Option<GithubArtifactLinkContext>,
    pub ide: Option<IdeArtifactLinkContext>,
}

fn encode_uri_component(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z'
            | b'a'..=b'z'
            | b'0'..=b'9'
            | b'-'
            | b'_'
            | b'.'
            | b'!'
            | b'~'
            | b'*'
            | b'\''
            | b'('
            | b')' => out.push(char::from(b)),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

fn encode_ide_path_segment(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z'
            | b'a'..=b'z'
            | b'0'..=b'9'
            | b'-'
            | b'_'
            | b'.'
            | b'!'
            | b'~'
            | b'*'
            | b'\''
            | b'('
            | b')'
            | b':' => out.push(char::from(b)),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

/// Join repository-relative project root with a project-relative artifact path (posix).
#[gitreqd::implements("GRD-UI-009")]
pub fn posix_join_repo_path(project_root_rel: &str, artifact_path: &str) -> String {
    let root = project_root_rel
        .replace('\\', "/")
        .trim_matches('/')
        .to_string();
    let artifact = artifact_path.replace('\\', "/");
    let artifact = artifact
        .strip_prefix("./")
        .unwrap_or(artifact.as_str())
        .to_string();
    if root.is_empty() {
        artifact
    } else {
        format!("{root}/{artifact}")
    }
}

/// Build a GitHub blob URL for an artifact at the loaded commit.
#[gitreqd::implements("GRD-UI-009")]
pub fn github_blob_url_for_artifact(
    artifact_path: &str,
    github: &GithubArtifactLinkContext,
) -> String {
    let repo_path = posix_join_repo_path(&github.project_root_rel, artifact_path);
    let encoded_path: String = repo_path
        .split('/')
        .filter(|segment| !segment.is_empty())
        .map(encode_uri_component)
        .collect::<Vec<_>>()
        .join("/");
    format!(
        "https://github.com/{}/{}/blob/{}/{}",
        github.owner,
        github.repo,
        encode_uri_component(&github.commit_sha),
        encoded_path
    )
}

fn is_absolute_fs_path(path: &str) -> bool {
    let posix = path.replace('\\', "/");
    posix.starts_with('/')
        || (posix.len() >= 3
            && posix.as_bytes()[0].is_ascii_alphabetic()
            && posix.as_bytes()[1] == b':'
            && posix.as_bytes()[2] == b'/')
}

/// Resolve a presented file path against the IDE project root to an absolute posix path.
#[gitreqd::implements("GRD-HTML-008")]
pub fn resolve_ide_fs_path(project_root: &str, file_path: &str) -> String {
    let file = file_path.replace('\\', "/");
    let file = file.strip_prefix("./").unwrap_or(file.as_str());
    if is_absolute_fs_path(file) {
        if file.as_bytes()[0].is_ascii_alphabetic() && file.as_bytes().get(1) == Some(&b':') {
            format!("/{file}")
        } else {
            file.to_string()
        }
    } else {
        let root = project_root.replace('\\', "/");
        let root = root.trim_end_matches('/');
        if root.is_empty() {
            if file.starts_with('/') {
                file.to_string()
            } else {
                format!("/{file}")
            }
        } else if is_absolute_fs_path(root) {
            format!("{root}/{file}")
        } else {
            format!("/{root}/{file}")
        }
    }
}

/// Build a host-IDE URL that opens `absolute_path` (and optional 1-based line).
#[gitreqd::implements("GRD-HTML-008")]
pub fn ide_file_url(scheme: &str, absolute_path: &str, line: Option<u32>) -> String {
    let posix = if is_absolute_fs_path(absolute_path)
        && absolute_path.as_bytes()[0].is_ascii_alphabetic()
        && absolute_path.as_bytes().get(1) == Some(&b':')
    {
        format!("/{}", absolute_path.replace('\\', "/"))
    } else {
        let p = absolute_path.replace('\\', "/");
        if p.starts_with('/') {
            p
        } else {
            format!("/{p}")
        }
    };
    let encoded: String = posix
        .split('/')
        .map(|segment| {
            if segment.is_empty() {
                String::new()
            } else {
                encode_ide_path_segment(segment)
            }
        })
        .collect::<Vec<_>>()
        .join("/");
    let mut url = format!("{scheme}://file{encoded}");
    if let Some(n) = line {
        url.push(':');
        url.push_str(&n.to_string());
    }
    url
}

/// URI scheme for a VS Code-derived environment, or `None` when not in one.
#[gitreqd::implements("GRD-HTML-008")]
pub fn vscode_derived_uri_scheme<F>(mut get: F) -> Option<String>
where
    F: FnMut(&str) -> Option<String>,
{
    let term_program = get("TERM_PROGRAM");
    let cursor_trace = get("CURSOR_TRACE_ID");
    let in_family = term_program.as_deref() == Some("vscode")
        || get("VSCODE_IPC_HOOK").is_some()
        || get("VSCODE_IPC_HOOK_CLI").is_some()
        || get("VSCODE_PID").is_some()
        || get("VSCODE_INJECTION").is_some()
        || cursor_trace.is_some();
    if !in_family {
        return None;
    }

    let haystack = [
        get("VSCODE_GIT_ASKPASS_NODE"),
        get("VSCODE_GIT_ASKPASS_MAIN"),
        get("VSCODE_IPC_HOOK"),
        get("VSCODE_IPC_HOOK_CLI"),
        get("GIT_ASKPASS"),
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<_>>()
    .join(" ")
    .to_ascii_lowercase();

    if cursor_trace.is_some() || haystack.contains("cursor") {
        return Some("cursor".into());
    }
    if haystack.contains("insiders") {
        return Some("vscode-insiders".into());
    }
    if haystack.contains("vscodium")
        || haystack.contains("/codium")
        || haystack.contains("\\codium")
    {
        return Some("vscodium".into());
    }
    if haystack.contains("windsurf") {
        return Some("windsurf".into());
    }
    Some("vscode".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn env(pairs: &[(&str, &str)]) -> impl Fn(&str) -> Option<String> {
        let map: HashMap<String, String> = pairs
            .iter()
            .map(|(k, v)| ((*k).to_string(), (*v).to_string()))
            .collect();
        move |k: &str| map.get(k).cloned()
    }

    #[gitreqd::verifies("GRD-UI-009")]
    #[test]
    fn joins_project_root_and_artifact_path_with_posix_slashes() {
        assert_eq!(
            posix_join_repo_path("apps/reqs", "src/foo.ts"),
            "apps/reqs/src/foo.ts"
        );
        assert_eq!(
            posix_join_repo_path("", "packages/core/src/a.ts"),
            "packages/core/src/a.ts"
        );
    }

    #[gitreqd::verifies("GRD-UI-009")]
    #[test]
    fn builds_github_blob_urls_at_the_loaded_commit() {
        let url = github_blob_url_for_artifact(
            "packages/core/src/a.ts",
            &GithubArtifactLinkContext {
                owner: "acme".into(),
                repo: "widgets".into(),
                commit_sha: "deadbeef".into(),
                project_root_rel: "apps/reqs".into(),
            },
        );
        assert_eq!(
            url,
            "https://github.com/acme/widgets/blob/deadbeef/apps/reqs/packages/core/src/a.ts"
        );
    }

    #[gitreqd::verifies("GRD-HTML-008")]
    #[test]
    fn builds_ide_file_urls_for_unix_and_windows_paths() {
        assert_eq!(
            ide_file_url("cursor", "/workspace/src/lib.rs", Some(12)),
            "cursor://file/workspace/src/lib.rs:12"
        );
        assert_eq!(
            ide_file_url("vscode", "C:/proj/app.rs", None),
            "vscode://file/C:/proj/app.rs"
        );
        assert_eq!(
            ide_file_url("vscode", "/tmp/my file.rs", Some(1)),
            "vscode://file/tmp/my%20file.rs:1"
        );
    }

    #[gitreqd::verifies("GRD-HTML-008")]
    #[test]
    fn resolves_relative_paths_against_the_project_root() {
        assert_eq!(
            resolve_ide_fs_path("/workspace", "src/lib.rs"),
            "/workspace/src/lib.rs"
        );
        assert_eq!(
            resolve_ide_fs_path("/workspace", "/abs/req.yml"),
            "/abs/req.yml"
        );
        assert_eq!(
            resolve_ide_fs_path("C:/proj", "src\\lib.rs"),
            "C:/proj/src/lib.rs"
        );
    }

    #[gitreqd::verifies("GRD-HTML-008")]
    #[test]
    fn detects_vscode_derived_uri_schemes_from_environment() {
        assert_eq!(vscode_derived_uri_scheme(env(&[])), None);
        assert_eq!(
            vscode_derived_uri_scheme(env(&[("TERM_PROGRAM", "xterm")])),
            None
        );
        assert_eq!(
            vscode_derived_uri_scheme(env(&[("TERM_PROGRAM", "vscode")])),
            Some("vscode".into())
        );
        assert_eq!(
            vscode_derived_uri_scheme(env(&[("CURSOR_TRACE_ID", "abc")])),
            Some("cursor".into())
        );
        assert_eq!(
            vscode_derived_uri_scheme(env(&[
                ("TERM_PROGRAM", "vscode"),
                (
                    "VSCODE_GIT_ASKPASS_NODE",
                    "/Applications/Cursor.app/Contents/Resources/app/helper"
                ),
            ])),
            Some("cursor".into())
        );
        assert_eq!(
            vscode_derived_uri_scheme(env(&[
                ("TERM_PROGRAM", "vscode"),
                (
                    "VSCODE_GIT_ASKPASS_NODE",
                    "/usr/share/code-insiders/resources/app/helper"
                ),
            ])),
            Some("vscode-insiders".into())
        );
        assert_eq!(
            vscode_derived_uri_scheme(env(&[
                ("VSCODE_PID", "1"),
                ("VSCODE_IPC_HOOK", "/tmp/vscodium-ipc"),
            ])),
            Some("vscodium".into())
        );
    }
}
