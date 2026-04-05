import { getBrowserAuth } from "@gitreqd/browser-auth";

describe("@gitreqd/browser-auth (stub)", () => {
  it("does not require login in the base gitreqd build", () => {
    expect(getBrowserAuth().isLoginRequired()).toBe(false);
  });
});
