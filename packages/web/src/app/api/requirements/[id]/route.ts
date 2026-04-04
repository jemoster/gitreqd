import { NextResponse } from "next/server";
import { loadProjectRequirements, toApiRequirement } from "@/lib/requirements-service";

/** GRD-API-001: Single requirement by id. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ requirement: toApiRequirement(req) });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: String(e) } },
      { status: 500 }
    );
  }
}
