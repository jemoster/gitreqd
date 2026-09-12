//! Optional context for rendering file-path hyperlinks in requirement HTML.
//! GRD-UI-009: GitHub blob URLs for satisfied_by / verified_by artifacts.
//! GRD-HTML-008: GitHub blob URLs at HEAD when `origin` is GitHub or GitHub Enterprise.

/// GitHub repository location used to build blob URLs for project-relative artifact paths.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct GithubArtifactLinkContext {
    /// GitHub host (`github.com` or a `github.*` Enterprise host). Empty means `github.com`.
    pub host: String,
    pub owner: String,
    pub repo: String,
    pub commit_sha: String,
    /// Repository-relative posix path to the gitreqd project root (may be empty).
    pub project_root_rel: String,
    /// Absolute gitreqd project root used to strip absolute presented paths. Empty when paths are already project-relative.
    pub project_root: String,
}

impl GithubArtifactLinkContext {
    pub fn github_host(&self) -> &str {
        let trimmed = self.host.trim();
        if trimmed.is_empty() {
            "github.com"
        } else {
            trimmed
        }
    }
}

/// Owner, repo, and host parsed from a git `origin` URL.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GithubOrigin {
    pub host: String,
    pub owner: String,
    pub repo: String,
}

/// Optional context for rendering artifact hyperlinks in requirement HTML.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ArtifactLinkRenderOptions {
    pub github: Option<GithubArtifactLinkContext>,
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

/// Strip an absolute presented path down to a project-relative posix path.
#[gitreqd::implements("GRD-HTML-008")]
pub fn project_relative_file_path(project_root: &str, file_path: &str) -> String {
    let file = file_path.replace('\\', "/");
    let file = file.strip_prefix("./").unwrap_or(file.as_str());
    let root = project_root.replace('\\', "/");
    let root = root.trim_end_matches('/');
    if !root.is_empty() {
        if file == root {
            return String::new();
        }
        let prefix = format!("{root}/");
        if let Some(rest) = file.strip_prefix(&prefix) {
            return rest.to_string();
        }
    }
    file.strip_prefix("./").unwrap_or(file).to_string()
}

fn github_line_fragment(line_start: Option<u32>, line_end: Option<u32>) -> String {
    let Some(start) = line_start.filter(|&n| n > 0) else {
        return String::new();
    };
    match line_end.filter(|&n| n > start) {
        Some(end) => format!("#L{start}-L{end}"),
        None => format!("#L{start}"),
    }
}

/// Build a GitHub blob URL for an artifact at the loaded commit.
#[gitreqd::implements("GRD-UI-009", "GRD-HTML-008")]
pub fn github_blob_url_for_artifact(
    artifact_path: &str,
    github: &GithubArtifactLinkContext,
) -> String {
    github_blob_url_for_path(artifact_path, github, None, None)
}

/// GRD-HTML-008: Blob URL with an optional GitHub line fragment (`#L10` or `#L10-L12`).
#[gitreqd::implements("GRD-HTML-008")]
pub fn github_blob_url_for_path(
    file_path: &str,
    github: &GithubArtifactLinkContext,
    line_start: Option<u32>,
    line_end: Option<u32>,
) -> String {
    let project_rel = project_relative_file_path(&github.project_root, file_path);
    let repo_path = posix_join_repo_path(&github.project_root_rel, &project_rel);
    let encoded_path: String = repo_path
        .split('/')
        .filter(|segment| !segment.is_empty())
        .map(encode_uri_component)
        .collect::<Vec<_>>()
        .join("/");
    format!(
        "https://{}/{}/{}/blob/{}/{}{}",
        github.github_host(),
        github.owner,
        github.repo,
        encode_uri_component(&github.commit_sha),
        encoded_path,
        github_line_fragment(line_start, line_end)
    )
}

/// True when `host` is github.com or a GitHub Enterprise host (`github.*`).
#[gitreqd::implements("GRD-HTML-008")]
pub fn is_github_host(host: &str) -> bool {
    let host = host.trim().to_ascii_lowercase();
    host == "github.com" || host.starts_with("github.")
}

/// Parse owner/repo from a git `origin` URL when the host is GitHub or GitHub Enterprise.
#[gitreqd::implements("GRD-HTML-008")]
pub fn parse_github_origin_url(url: &str) -> Option<GithubOrigin> {
    let url = url.trim();
    if url.is_empty() {
        return None;
    }
    if let Some(rest) = url.strip_prefix("git@") {
        let (host, path) = rest.split_once(':')?;
        return owner_repo_from_host_path(host, path);
    }
    let rest = url
        .strip_prefix("ssh://")
        .or_else(|| url.strip_prefix("https://"))
        .or_else(|| url.strip_prefix("http://"))
        .or_else(|| url.strip_prefix("git://"))?;
    let rest = rest
        .split_once('@')
        .map(|(_, hostpath)| hostpath)
        .unwrap_or(rest);
    let rest = rest.trim_start_matches('/');
    let (host_and_port, path) = rest.split_once('/')?;
    let host = host_and_port.split(':').next().unwrap_or(host_and_port);
    owner_repo_from_host_path(host, path)
}

fn owner_repo_from_host_path(host: &str, path: &str) -> Option<GithubOrigin> {
    if !is_github_host(host) {
        return None;
    }
    let path = path.trim_matches('/').trim_end_matches(".git");
    let mut parts = path.split('/');
    let owner = parts.next()?.trim();
    let repo = parts.next()?.trim();
    if owner.is_empty() || repo.is_empty() {
        return None;
    }
    Some(GithubOrigin {
        host: host.to_string(),
        owner: owner.to_string(),
        repo: repo.to_string(),
    })
}

/// Posix path of `project_root` relative to the git toplevel (empty when they are the same).
#[gitreqd::implements("GRD-HTML-008")]
pub fn github_project_root_rel(toplevel: &str, project_root: &str) -> String {
    let top = toplevel.replace('\\', "/");
    let top = top.trim_end_matches('/');
    let project = project_root.replace('\\', "/");
    let project = project.trim_end_matches('/');
    if top.is_empty() || project == top {
        return String::new();
    }
    let prefix = format!("{top}/");
    project.strip_prefix(&prefix).unwrap_or("").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn github(
        owner: &str,
        repo: &str,
        sha: &str,
        project_root_rel: &str,
    ) -> GithubArtifactLinkContext {
        GithubArtifactLinkContext {
            owner: owner.into(),
            repo: repo.into(),
            commit_sha: sha.into(),
            project_root_rel: project_root_rel.into(),
            ..Default::default()
        }
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
            &github("acme", "widgets", "deadbeef", "apps/reqs"),
        );
        assert_eq!(
            url,
            "https://github.com/acme/widgets/blob/deadbeef/apps/reqs/packages/core/src/a.ts"
        );
    }

    #[gitreqd::verifies("GRD-HTML-008")]
    #[test]
    fn parses_github_com_and_enterprise_origin_urls() {
        assert_eq!(
            parse_github_origin_url("https://github.com/acme/widgets.git"),
            Some(GithubOrigin {
                host: "github.com".into(),
                owner: "acme".into(),
                repo: "widgets".into(),
            })
        );
        assert_eq!(
            parse_github_origin_url("git@github.com:acme/widgets.git"),
            Some(GithubOrigin {
                host: "github.com".into(),
                owner: "acme".into(),
                repo: "widgets".into(),
            })
        );
        assert_eq!(
            parse_github_origin_url("ssh://git@github.example.com/acme/widgets.git"),
            Some(GithubOrigin {
                host: "github.example.com".into(),
                owner: "acme".into(),
                repo: "widgets".into(),
            })
        );
        assert_eq!(
            parse_github_origin_url("https://gitlab.com/acme/widgets.git"),
            None
        );
        assert_eq!(parse_github_origin_url(""), None);
    }

    #[gitreqd::verifies("GRD-HTML-008")]
    #[test]
    fn builds_enterprise_blob_urls_with_line_fragments() {
        let mut ctx = github("acme", "widgets", "deadbeef", "");
        ctx.host = "github.example.com".into();
        assert_eq!(
            github_blob_url_for_path("src/lib.rs", &ctx, Some(10), Some(12)),
            "https://github.example.com/acme/widgets/blob/deadbeef/src/lib.rs#L10-L12"
        );
        assert_eq!(
            github_blob_url_for_path("src/lib.rs", &ctx, Some(10), None),
            "https://github.example.com/acme/widgets/blob/deadbeef/src/lib.rs#L10"
        );
    }

    #[gitreqd::verifies("GRD-HTML-008")]
    #[test]
    fn strips_absolute_paths_before_joining_project_root_rel() {
        let mut ctx = github("acme", "widgets", "abc", "gitreqd");
        ctx.project_root = "/home/dev/src/gitreqd".into();
        assert_eq!(
            github_blob_url_for_artifact(
                "/home/dev/src/gitreqd/requirements/cli/GRD-CLI-001.req.yml",
                &ctx
            ),
            "https://github.com/acme/widgets/blob/abc/gitreqd/requirements/cli/GRD-CLI-001.req.yml"
        );
        assert_eq!(
            github_project_root_rel("/home/dev/src/cloud", "/home/dev/src/cloud/gitreqd"),
            "gitreqd"
        );
        assert_eq!(
            github_project_root_rel("/home/dev/src/cloud", "/home/dev/src/cloud"),
            ""
        );
    }
}
