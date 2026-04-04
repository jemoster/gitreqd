import { NextResponse } from "next/server";
import { loadProjectRequirements, renderedDetailHtml } from "@/lib/requirements-service";
import { requireApiSession } from "@/lib/require-api-session";

/** GRD-API-001 + GRD-HTML-*: Rendered detail fragment for the detail pane. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireApiSession();
  if (!gate.ok) return gate.response;
  try {
    const { id } = await context.params;
    const { requirements } = await loadProjectRequirements();
    const req = requirements.find((r) => r.id === id);
    if (!req) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Requirement not found: ${id}` } },
        { status: 404 }
      );
    }
    const html = renderedDetailHtml(req, requirements);
    return NextResponse.json({ html });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: String(e) } },
      { status: 500 }
    );
  }
}
