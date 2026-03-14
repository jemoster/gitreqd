/**
 * GRD-SYS-005: Tests for requirement parameterization (template resolution).
 */
import { resolveText, resolveToSegments } from "../src/parameters";
import type { RequirementWithSource } from "../src/types";

function r(
  id: string,
  title: string,
  params?: Record<string, string | number | boolean>
): RequirementWithSource {
  return {
    id,
    title,
    description: "",
    sourcePath: `/${id}.yml`,
    ...(params && { parameters: params }),
  };
}

describe("resolveToSegments (GRD-SYS-005)", () => {
  it("returns plain segment when no template", () => {
    const byId = new Map<string, RequirementWithSource>([
      [r("A", "Title", { x: "1" }).id, r("A", "Title", { x: "1" })],
    ]);
    const segs = resolveToSegments("hello world", "A", byId);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({ type: "plain", text: "hello world" });
  });

  it("resolves local parameter {{ :param_name }}", () => {
    const byId = new Map<string, RequirementWithSource>([
      [r("R", "T", { limit: 10, name: "foo" }).id, r("R", "T", { limit: 10, name: "foo" })],
    ]);
    const segs = resolveToSegments("Limit is {{ :limit }} and {{ :name }}.", "R", byId);
    expect(segs).toHaveLength(5);
    expect(segs[0]).toEqual({ type: "plain", text: "Limit is " });
    expect(segs[1]).toEqual({ type: "param", text: "10", sourceReqId: "R", paramName: "limit" });
    expect(segs[2]).toEqual({ type: "plain", text: " and " });
    expect(segs[3]).toEqual({ type: "param", text: "foo", sourceReqId: "R", paramName: "name" });
    expect(segs[4]).toEqual({ type: "plain", text: "." });
  });

  it("resolves cross-requirement {{ requirement_id:parameter_name }}", () => {
    const reqA = r("GRD-A", "A", { max: 100 });
    const reqB = r("GRD-B", "B");
    const byId = new Map<string, RequirementWithSource>([
      [reqA.id, reqA],
      [reqB.id, reqB],
    ]);
    const segs = resolveToSegments("Max from A is {{ GRD-A:max }}.", "GRD-B", byId);
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ type: "plain", text: "Max from A is " });
    expect(segs[1]).toEqual({ type: "param", text: "100", sourceReqId: "GRD-A", paramName: "max" });
    expect(segs[2]).toEqual({ type: "plain", text: "." });
  });

  it("leaves unresolved placeholder when parameter missing", () => {
    const byId = new Map<string, RequirementWithSource>([[r("R", "T").id, r("R", "T")]]);
    const segs = resolveToSegments("Value {{ :missing }} here", "R", byId);
    expect(segs).toHaveLength(3);
    expect(segs[1]).toEqual({
      type: "param",
      text: "[param :missing not found]",
      sourceReqId: "R",
      paramName: "missing",
    });
  });

  it("leaves unresolved placeholder when cross-requirement or param missing", () => {
    const byId = new Map<string, RequirementWithSource>([[r("R", "T", { x: 1 }).id, r("R", "T", { x: 1 })]]);
    const segs = resolveToSegments("A: {{ NO-SUCH:id }} and {{ R:y }}", "R", byId);
    expect(segs[1].text).toContain("not found");
    expect(segs[3].text).toContain("not found");
  });

  it("coerces number and boolean to string", () => {
    const byId = new Map<string, RequirementWithSource>([
      [r("R", "T", { n: 42, flag: true }).id, r("R", "T", { n: 42, flag: true })],
    ]);
    const segs = resolveToSegments("n={{ :n }} flag={{ :flag }}", "R", byId);
    expect(segs[1].text).toBe("42");
    expect(segs[3].text).toBe("true");
  });
});

describe("resolveText (GRD-SYS-005)", () => {
  it("concatenates segments to single string", () => {
    const byId = new Map<string, RequirementWithSource>([
      [r("R", "T", { x: "X" }).id, r("R", "T", { x: "X" })],
    ]);
    expect(resolveText("a {{ :x }} b", "R", byId)).toBe("a X b");
  });
});

describe("GRD-SYS-006: quoted string inside {{ }} is literal (not processed)", () => {
  it("treats double-quoted string inside {{ }} as plain literal", () => {
    const byId = new Map<string, RequirementWithSource>([[r("R", "T", { x: "X" }).id, r("R", "T", { x: "X" })]]);
    const segs = resolveToSegments('Prefix {{ "literal text" }} suffix', "R", byId);
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ type: "plain", text: "Prefix " });
    expect(segs[1]).toEqual({ type: "plain", text: "literal text" });
    expect(segs[2]).toEqual({ type: "plain", text: " suffix" });
  });

  it("treats single-quoted string inside {{ }} as plain literal", () => {
    const byId = new Map<string, RequirementWithSource>([[r("R", "T").id, r("R", "T")]]);
    const segs = resolveToSegments("Value: {{ 'fixed' }}.", "R", byId);
    expect(segs).toHaveLength(3);
    expect(segs[1]).toEqual({ type: "plain", text: "fixed" });
  });

  it("does not substitute parameters inside quoted literals", () => {
    const byId = new Map<string, RequirementWithSource>([
      [r("R", "T", { name: "resolved" }).id, r("R", "T", { name: "resolved" })],
    ]);
    const out = resolveText('Literal {{ "{{ :name }}" }} and param {{ :name }}', "R", byId);
    expect(out).toBe('Literal {{ :name }} and param resolved');
  });

  it("unescapes \\\" and \\\\ in double-quoted literals", () => {
    const byId = new Map<string, RequirementWithSource>([[r("R", "T").id, r("R", "T")]]);
    const segs = resolveToSegments('{{ "a\\\\b\\"c" }}', "R", byId);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({ type: "plain", text: 'a\\b"c' });
  });

  it("unescapes \\' and \\\\ in single-quoted literals", () => {
    const byId = new Map<string, RequirementWithSource>([[r("R", "T").id, r("R", "T")]]);
    const segs = resolveToSegments("{{ 'x\\\\y\\'z' }}", "R", byId);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({ type: "plain", text: "x\\y'z" });
  });

  it("resolveText emits literal and param correctly together", () => {
    const byId = new Map<string, RequirementWithSource>([
      [r("R", "T", { limit: 10 }).id, r("R", "T", { limit: 10 })],
    ]);
    expect(resolveText('Limit is {{ "max" }}: {{ :limit }}', "R", byId)).toBe("Limit is max: 10");
  });
});
