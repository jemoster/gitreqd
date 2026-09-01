/**
 * GRD-DEVOPS-003: Shared package version, matching core pins, tag vX.Y.Z, and versioned artifact names.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const BUMP_SCRIPT = path.join(REPO_ROOT, "scripts", "bump-version.py");
const ASSERT_SCRIPT = path.join(REPO_ROOT, "scripts", "assert-release-tag.py");
const CLI_RELEASE_WORKFLOW = path.join(REPO_ROOT, ".github", "workflows", "release-cli.yml");
const VSCODE_RELEASE_WORKFLOW = path.join(REPO_ROOT, ".github", "workflows", "release-vscode.yml");
const RELEASE_GUIDE = path.join(REPO_ROOT, "release.md");
const README = path.join(REPO_ROOT, "README.md");
const CORE_PKG = path.join(REPO_ROOT, "packages", "core", "package.json");
const CLI_PKG = path.join(REPO_ROOT, "packages", "cli", "package.json");
const VSCODE_PKG = path.join(REPO_ROOT, "packages", "vscode", "package.json");
const CARGO_TOML = path.join(REPO_ROOT, "Cargo.toml");

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;
}

function sharedPackageVersion(): string {
  const version = readJson(CORE_PKG).version;
  if (typeof version !== "string" || !version) {
    throw new Error("packages/core/package.json is missing version");
  }
  return version;
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gitreqd-grd-devops-003-"));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function fixturePackageJson(name: string, version: string, withCoreDep: boolean): Record<string, unknown> {
  const pkg: Record<string, unknown> = {
    name,
    version,
    description: "gitreqd — fixture",
  };
  if (withCoreDep) {
    pkg.dependencies = { "@gitreqd/core": version };
  }
  return pkg;
}

function seedVersionTree(tmpDir: string, version: string): void {
  fs.mkdirSync(path.join(tmpDir, "scripts"), { recursive: true });
  fs.copyFileSync(BUMP_SCRIPT, path.join(tmpDir, "scripts", "bump-version.py"));
  fs.copyFileSync(ASSERT_SCRIPT, path.join(tmpDir, "scripts", "assert-release-tag.py"));
  fs.chmodSync(path.join(tmpDir, "scripts", "bump-version.py"), 0o755);
  fs.chmodSync(path.join(tmpDir, "scripts", "assert-release-tag.py"), 0o755);

  writeJson(path.join(tmpDir, "packages", "core", "package.json"), fixturePackageJson("@gitreqd/core", version, false));
  writeJson(path.join(tmpDir, "packages", "cli", "package.json"), fixturePackageJson("gitreqd", version, true));
  writeJson(
    path.join(tmpDir, "packages", "vscode", "package.json"),
    fixturePackageJson("gitreqd-vscode", version, true)
  );
  writeJson(path.join(tmpDir, "package-lock.json"), {
    name: "gitreqd",
    lockfileVersion: 3,
    packages: {
      "packages/core": { name: "@gitreqd/core", version },
      "packages/cli": { name: "gitreqd", version, dependencies: { "@gitreqd/core": version } },
      "packages/vscode": { name: "gitreqd-vscode", version, dependencies: { "@gitreqd/core": version } },
    },
  });
  fs.writeFileSync(
    path.join(tmpDir, "Cargo.toml"),
    `[workspace]\nmembers = []\n\n[workspace.package]\nedition = "2021"\nversion = "${version}"\n`
  );
  fs.writeFileSync(
    path.join(tmpDir, "Cargo.lock"),
    `[[package]]\nname = "gitreqd"\nversion = "${version}"\n\n[[package]]\nname = "gitreqd-core"\nversion = "${version}"\n`
  );
  fs.writeFileSync(
    path.join(tmpDir, "README.md"),
    [
      "npm install -g \\",
      `  "https://github.com/example/gitreqd/releases/download/v${version}/gitreqd-core-${version}.tgz" \\`,
      `  "https://github.com/example/gitreqd/releases/download/v${version}/gitreqd-${version}.tgz"`,
      "",
    ].join("\n")
  );
  fs.mkdirSync(path.join(tmpDir, "packages", "vscode"), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, "packages", "vscode", "README.md"),
    `This produces gitreqd-vscode-${version}.vsix.\n`
  );
}

describe("GRD-DEVOPS-003: shared release version", () => {
  it("workspace packages, @gitreqd/core pins, and Cargo workspace version match", () => {
    const version = sharedPackageVersion();
    expect(readJson(CLI_PKG).version).toBe(version);
    expect(readJson(VSCODE_PKG).version).toBe(version);
    const cliDeps = readJson(CLI_PKG).dependencies as Record<string, string>;
    const vscodeDeps = readJson(VSCODE_PKG).dependencies as Record<string, string>;
    expect(cliDeps["@gitreqd/core"]).toBe(version);
    expect(vscodeDeps["@gitreqd/core"]).toBe(version);

    const cargo = fs.readFileSync(CARGO_TOML, "utf-8");
    const match = cargo.match(/\[workspace\.package\][^\[]*?version\s*=\s*"([^"]+)"/s);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe(version);
  });

  it("README install URLs use the shared version in both the tag and artifact names", () => {
    const version = sharedPackageVersion();
    const readme = fs.readFileSync(README, "utf-8");
    expect(readme).toContain(`/releases/download/v${version}/gitreqd-core-${version}.tgz`);
    expect(readme).toContain(`/releases/download/v${version}/gitreqd-${version}.tgz`);
  });

  it("bump-version.py updates packages, lockfiles, and README install URLs", () => {
    const tmpDir = makeTempDir();
    seedVersionTree(tmpDir, "0.1.0");
    execFileSync("python3", [path.join(tmpDir, "scripts", "bump-version.py"), "9.8.7"], {
      cwd: tmpDir,
      stdio: "pipe",
    });

    expect(readJson(path.join(tmpDir, "packages", "core", "package.json")).version).toBe("9.8.7");
    const corePkgText = fs.readFileSync(path.join(tmpDir, "packages", "core", "package.json"), "utf-8");
    expect(corePkgText).toContain("gitreqd — fixture");
    expect(corePkgText).not.toContain("\\u2014");
    expect(readJson(path.join(tmpDir, "packages", "cli", "package.json")).version).toBe("9.8.7");
    expect(readJson(path.join(tmpDir, "packages", "vscode", "package.json")).version).toBe("9.8.7");
    const cliDeps = readJson(path.join(tmpDir, "packages", "cli", "package.json")).dependencies as Record<
      string,
      string
    >;
    expect(cliDeps["@gitreqd/core"]).toBe("9.8.7");
    const lock = readJson(path.join(tmpDir, "package-lock.json"));
    const packages = lock.packages as Record<string, { version?: string; dependencies?: Record<string, string> }>;
    expect(packages["packages/core"].version).toBe("9.8.7");
    expect(packages["packages/cli"].dependencies?.["@gitreqd/core"]).toBe("9.8.7");
    expect(fs.readFileSync(path.join(tmpDir, "Cargo.toml"), "utf-8")).toContain('version = "9.8.7"');
    expect(fs.readFileSync(path.join(tmpDir, "Cargo.lock"), "utf-8")).toContain('name = "gitreqd"\nversion = "9.8.7"');
    expect(fs.readFileSync(path.join(tmpDir, "Cargo.lock"), "utf-8")).toContain(
      'name = "gitreqd-core"\nversion = "9.8.7"'
    );
    const readme = fs.readFileSync(path.join(tmpDir, "README.md"), "utf-8");
    expect(readme).toContain("/releases/download/v9.8.7/gitreqd-core-9.8.7.tgz");
    expect(readme).toContain("/releases/download/v9.8.7/gitreqd-9.8.7.tgz");
    expect(readme).not.toContain("0.1.0");
    expect(fs.readFileSync(path.join(tmpDir, "packages", "vscode", "README.md"), "utf-8")).toContain(
      "gitreqd-vscode-9.8.7.vsix"
    );
  });

  it("bump-version.py rewrites README tags that already disagree with package.json", () => {
    const tmpDir = makeTempDir();
    seedVersionTree(tmpDir, "0.1.0");
    fs.writeFileSync(
      path.join(tmpDir, "README.md"),
      [
        "npm install -g \\",
        '  "https://github.com/example/gitreqd/releases/download/v0.2.0/gitreqd-core-0.1.0.tgz" \\',
        '  "https://github.com/example/gitreqd/releases/download/v0.2.0/gitreqd-0.1.0.tgz"',
        "",
      ].join("\n")
    );
    execFileSync("python3", [path.join(tmpDir, "scripts", "bump-version.py"), "9.8.7"], {
      cwd: tmpDir,
      stdio: "pipe",
    });
    const readme = fs.readFileSync(path.join(tmpDir, "README.md"), "utf-8");
    expect(readme).toContain("/releases/download/v9.8.7/gitreqd-core-9.8.7.tgz");
    expect(readme).toContain("/releases/download/v9.8.7/gitreqd-9.8.7.tgz");
    expect(readme).not.toContain("v0.2.0");
    expect(readme).not.toContain("0.1.0");
  });

  it("assert-release-tag.py accepts a matching tag and required artifact names", () => {
    const tmpDir = makeTempDir();
    seedVersionTree(tmpDir, "1.2.3");
    fs.mkdirSync(path.join(tmpDir, "release"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "release", "gitreqd-1.2.3.tgz"), "");
    fs.writeFileSync(path.join(tmpDir, "release", "gitreqd-core-1.2.3.tgz"), "");
    const out = execFileSync("python3", [path.join(tmpDir, "scripts", "assert-release-tag.py"), "v1.2.3", "cli"], {
      cwd: tmpDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    expect(out).toContain("v1.2.3");
    expect(out).toContain("1.2.3");
  });

  it("assert-release-tag.py rejects a tag that does not match the package version", () => {
    const tmpDir = makeTempDir();
    seedVersionTree(tmpDir, "1.2.3");
    expect(() =>
      execFileSync("python3", [path.join(tmpDir, "scripts", "assert-release-tag.py"), "v9.9.9"], {
        cwd: tmpDir,
        stdio: "pipe",
      })
    ).toThrow();
  });

  it("release workflows invoke assert-release-tag.py before upload", () => {
    const cliWorkflow = fs.readFileSync(CLI_RELEASE_WORKFLOW, "utf-8");
    expect(cliWorkflow).toContain("python3 ./scripts/assert-release-tag.py");
    expect(cliWorkflow).toContain('"${{ github.event.release.tag_name }}" cli');
    expect(cliWorkflow).toContain('"${{ github.event.release.tag_name }}" native');
    const vscodeWorkflow = fs.readFileSync(VSCODE_RELEASE_WORKFLOW, "utf-8");
    expect(vscodeWorkflow).toContain("python3 ./scripts/assert-release-tag.py");
    expect(vscodeWorkflow).toContain('"${{ github.event.release.tag_name }}" vscode');
  });

  it("release guide documents the bump script as the version-update step", () => {
    const guide = fs.readFileSync(RELEASE_GUIDE, "utf-8");
    expect(guide).toContain("./scripts/bump-version.py X.Y.Z");
    expect(guide).toContain("git tag vX.Y.Z");
    expect(guide).toContain("Publish the GitHub Release");
  });
});
