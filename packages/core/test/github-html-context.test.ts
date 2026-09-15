import { detectGithubHtmlOptions, parseGithubRemoteUrl, posixPathRelativeToRoot } from "../src/github-html-context.js";
import type { RequirementWithSource } from "../src/types.js";

/** GRD-HTML-007 */
describe("github-html-context", () => {
  describe("parseGithubRemoteUrl", () => {
    it("parses HTTPS, SSH, and git protocol remotes", () => {
      expect(parseGithubRemoteUrl("https://github.com/acme/widgets.git")).toEqual({
        owner: "acme",
        repo: "widgets",
      });
      expect(parseGithubRemoteUrl("git@github.com:acme/widgets.git")).toEqual({
        owner: "acme",
        repo: "widgets",
      });
      expect(parseGithubRemoteUrl("ssh://git@github.com/acme/widgets.git")).toEqual({
        owner: "acme",
        repo: "widgets",
      });
      expect(parseGithubRemoteUrl("git://github.com/acme/widgets")).toEqual({
        owner: "acme",
        repo: "widgets",
      });
    });

    it("returns null for non-GitHub remotes", () => {
      expect(parseGithubRemoteUrl("https://gitlab.com/acme/widgets.git")).toBeNull();
    });
  });

  describe("posixPathRelativeToRoot", () => {
    it("returns a posix-relative path inside the root", () => {
      expect(posixPathRelativeToRoot("/repo", "/repo/requirements/a.req.yml")).toBe(
        "requirements/a.req.yml"
      );
    });

    it("returns null when the path is outside the root", () => {
      expect(posixPathRelativeToRoot("/repo", "/other/a.req.yml")).toBeNull();
    });
  });

  describe("detectGithubHtmlOptions", () => {
    const req: RequirementWithSource = {
      id: "GRD-A",
      title: "A",
      require: "The system shall A.",
      refinement: "",
      sourcePath: "/repo/apps/reqs/GRD-A.req.yml",
    };

    it("builds artifact and source-file link context from git metadata", () => {
      const runGit = (args: string[]) => {
        if (args[0] === "rev-parse" && args[1] === "--show-toplevel") return "/repo";
        if (args[0] === "rev-parse" && args[1] === "HEAD") return "abcdef1234567890";
        if (args[0] === "remote") return "https://github.com/acme/widgets.git";
        return null;
      };
      const options = detectGithubHtmlOptions("/repo/apps/reqs", [req], runGit);
      expect(options?.artifactLinks?.github).toEqual({
        owner: "acme",
        repo: "widgets",
        commitSha: "abcdef1234567890",
        projectRootRel: "apps/reqs",
      });
      expect(options?.sourceRepoPaths?.get("GRD-A")).toBe("apps/reqs/GRD-A.req.yml");
    });

    it("returns undefined when origin is not GitHub", () => {
      const runGit = (args: string[]) => {
        if (args[0] === "rev-parse" && args[1] === "--show-toplevel") return "/repo";
        if (args[0] === "rev-parse" && args[1] === "HEAD") return "abc";
        if (args[0] === "remote") return "https://gitlab.com/acme/widgets.git";
        return null;
      };
      expect(detectGithubHtmlOptions("/repo", [req], runGit)).toBeUndefined();
    });
  });
});
