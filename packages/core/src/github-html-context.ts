/**
 * GRD-HTML-007: Discover GitHub repository identity and HEAD commit from a local Git working tree
 * so the HTML report can emit commit-pinned blob links.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

import type { ArtifactLinkRenderOptions } from "./artifact-links.js";
import type { FullHtmlOptions } from "./html.js";
import type { RequirementWithSource } from "./types.js";

export type GitCommandRunner = (args: string[], cwd: string) => string | null;

function defaultGitRunner(args: string[], cwd: string): string | null {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: 5_000,
  });
  if (result.status !== 0) return null;
  const out = (result.stdout ?? "").trim();
  return out.length > 0 ? out : null;
}

/** Parse owner/repo from a GitHub remote URL (HTTPS, SSH, or git protocol). */
export function parseGithubRemoteUrl(remoteUrl: string): { owner: string; repo: string } | null {
  const trimmed = remoteUrl.trim().replace(/\.git$/i, "");
  const https = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/i);
  if (https) return { owner: https[1]!, repo: https[2]! };
  const ssh = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)\/?$/i);
  if (ssh) return { owner: ssh[1]!, repo: ssh[2]! };
  const sshUri = trimmed.match(/^ssh:\/\/git@github\.com\/([^/]+)\/([^/]+?)\/?$/i);
  if (sshUri) return { owner: sshUri[1]!, repo: sshUri[2]! };
  const git = trimmed.match(/^git:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/i);
  if (git) return { owner: git[1]!, repo: git[2]! };
  return null;
}

/** Repository-relative posix path, or null when `absPath` is outside `root`. */
export function posixPathRelativeToRoot(root: string, absPath: string): string | null {
  const rel = path.relative(path.resolve(root), path.resolve(absPath));
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    return rel === "" ? "" : null;
  }
  return rel.split(path.sep).filter(Boolean).join("/");
}

export function detectGithubHtmlOptions(
  projectRoot: string,
  requirements: RequirementWithSource[],
  runGit: GitCommandRunner = defaultGitRunner
): FullHtmlOptions | undefined {
  const gitRoot = runGit(["rev-parse", "--show-toplevel"], projectRoot);
  const commitSha = runGit(["rev-parse", "HEAD"], projectRoot);
  const remoteUrl =
    runGit(["remote", "get-url", "origin"], projectRoot) ??
    runGit(["config", "--get", "remote.origin.url"], projectRoot);
  if (!gitRoot || !commitSha || !remoteUrl) return undefined;

  const parsed = parseGithubRemoteUrl(remoteUrl);
  if (!parsed) return undefined;

  const projectRootRel = posixPathRelativeToRoot(gitRoot, projectRoot) ?? "";
  const github: NonNullable<ArtifactLinkRenderOptions["github"]> = {
    owner: parsed.owner,
    repo: parsed.repo,
    commitSha,
    projectRootRel,
  };

  const sourceRepoPaths = new Map<string, string>();
  for (const r of requirements) {
    const rel = posixPathRelativeToRoot(gitRoot, r.sourcePath);
    if (rel) sourceRepoPaths.set(r.id, rel);
  }

  return {
    artifactLinks: { github },
    sourceRepoPaths,
  };
}
