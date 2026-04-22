# Release Instructions

This guide describes the minimum steps to cut a new GitHub release that publishes installable artifacts for `gitreqd`.

## 1) Prepare the release

1. Ensure your working tree is clean and all required checks are green.
2. Update versions/changelog content as needed for the release.
3. Merge the release-ready changes to the default branch.

## 2) Create and push a version tag

```bash
git checkout main
git pull
git tag vX.Y.Z
git push origin vX.Y.Z
```

Use semantic versioning for `vX.Y.Z`.

## 3) Publish the GitHub Release

1. Open GitHub Releases for the repository.
2. Create a new release from tag `vX.Y.Z`.
3. Add concise release notes describing notable changes.
4. Publish the release.

## 4) Verify artifacts and install path

1. Confirm release automation completed successfully.
2. Confirm required artifacts are attached to the release, including CLI `.tgz` assets produced by workflow automation.
3. Validate direct install from a GitHub-hosted source tarball URL, for example:

```bash
npm install -g "https://github.com/<org>/<repo>/releases/download/vX.Y.Z/<artifact>.tgz"
```
