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
2. Confirm required artifacts are attached to the release, including CLI `.tgz` assets and the Linux x86_64 native CLI binary (`gitreqd-linux-x86_64`) produced by workflow automation.
3. Validate direct install from a GitHub-hosted source tarball URL, for example:

```bash
npm install -g "https://github.com/<org>/<repo>/releases/download/vX.Y.Z/<artifact>.tgz"
```

4. On Linux x86_64, confirm the native binary can be downloaded from the same release, marked executable, and run as `gitreqd`.

## Testing release generation

Use these steps before (or instead of) publishing a GitHub Release.

### Local packaging (same scripts as CI)

```bash
./scripts/package.sh
./scripts/package-native-cli.sh
```

Confirm `release/` contains CLI `.tgz` files and `gitreqd-linux-x86_64`. On Linux x86_64, run `./release/gitreqd-linux-x86_64 --help`.

### Download the native binary from a branch or pull request

The Tests workflow packages the native CLI and uploads it as a workflow artifact named `gitreqd-linux-x86_64`.

From the GitHub UI: open the Actions run for the branch, open the `cargo test` job, and download the `gitreqd-linux-x86_64` artifact.

From the CLI (replace the run id with the latest Tests run for the branch):

```bash
gh run list --workflow=test.yml --branch <branch> --limit 1
gh run download <run-id> --name gitreqd-linux-x86_64
chmod +x gitreqd-linux-x86_64
./gitreqd-linux-x86_64 --help
```

### Dry-run the CLI release workflow

Actions → **Release CLI artifacts** → **Run workflow**. Manual `workflow_dispatch` runs the same packaging as a published release, then uploads `cli-tarballs` and `gitreqd-linux-x86_64` as workflow artifacts. It does not create or modify a GitHub Release.

### Full GitHub Release path

Publish a GitHub Release (a prerelease is enough) from a tag. That is the only trigger that attaches assets with `gh release upload`. Confirm the release page includes the `.tgz` files and `gitreqd-linux-x86_64`.
