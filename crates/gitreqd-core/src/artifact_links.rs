//! GRD-UI-009: Optional context for rendering satisfied_by / verified_by artifact links
//! in browser detail HTML.

/// GitHub repository location used to build blob URLs for project-relative artifact paths.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GithubArtifactLinkContext {
    pub owner: String,
    pub repo: String,
    pub commit_sha: String,
    /// Repository-relative posix path to the gitreqd project root (may be empty).
    pub project_root_rel: String,
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

#[cfg(test)]
mod tests {
    use super::*;

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
}
