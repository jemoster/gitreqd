import { githubBlobUrlForArtifact, posixJoinRepoPath } from "../src/artifact-links.js";

/** GRD-UI-009 */
describe("artifact-links", () => {
  it("joins project root and artifact path with posix slashes", () => {
    expect(posixJoinRepoPath("apps/reqs", "src/foo.ts")).toBe("apps/reqs/src/foo.ts");
    expect(posixJoinRepoPath("", "packages/core/src/a.ts")).toBe("packages/core/src/a.ts");
  });

  it("builds GitHub blob URLs at the loaded commit", () => {
    const url = githubBlobUrlForArtifact("packages/core/src/a.ts", {
      owner: "acme",
      repo: "widgets",
      commitSha: "deadbeef",
      projectRootRel: "apps/reqs",
    });
    expect(url).toBe(
      "https://github.com/acme/widgets/blob/deadbeef/apps/reqs/packages/core/src/a.ts"
    );
  });
});
