/** GRD-UI-009: Optional context for rendering satisfied_by / verified_by artifact links in browser detail HTML. */
export type ArtifactLinkRenderOptions = {
  github?: {
    owner: string;
    repo: string;
    commitSha: string;
    /** Repository-relative posix path to the gitreqd project root (may be empty). */
    projectRootRel: string;
  };
};

/** Join repository-relative project root with a project-relative artifact path (posix). */
export function posixJoinRepoPath(projectRootRel: string, artifactPath: string): string {
  const root = projectRootRel.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const artifact = artifactPath.replace(/\\/g, "/").replace(/^\.\//, "");
  return root ? `${root}/${artifact}` : artifact;
}

/** Build a GitHub blob URL for an artifact at the loaded commit. */
export function githubBlobUrlForArtifact(
  artifactPath: string,
  github: NonNullable<ArtifactLinkRenderOptions["github"]>
): string {
  const repoPath = posixJoinRepoPath(github.projectRootRel, artifactPath);
  const encodedPath = repoPath
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(encodeURIComponent)
    .join("/");
  return `https://github.com/${github.owner}/${github.repo}/blob/${encodeURIComponent(github.commitSha)}/${encodedPath}`;
}
