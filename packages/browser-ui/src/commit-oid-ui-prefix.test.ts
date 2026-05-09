/** Covers GRD-UI-005 commit prefix formatting. */
import { commitOidUiPrefix } from "./commit-oid-ui-prefix";

describe("commitOidUiPrefix", () => {
  it("returns the first seven characters of the oid", () => {
    expect(commitOidUiPrefix("deadbeefcafebabec0ffee")).toBe("deadbee");
  });

  it("trims whitespace before slicing", () => {
    expect(commitOidUiPrefix("  abcdef123  ")).toBe("abcdef1");
  });

  it("returns empty string for blank input", () => {
    expect(commitOidUiPrefix("")).toBe("");
    expect(commitOidUiPrefix("   ")).toBe("");
  });

  it("returns the whole string when shorter than seven characters", () => {
    expect(commitOidUiPrefix("abc")).toBe("abc");
  });
});
