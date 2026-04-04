import { NextResponse } from "next/server";
import { loadProjectRequirements, toApiRequirement } from "@/lib/requirements-service";
import { requireApiSession } from "@/lib/require-api-session";

/** GRD-API-001: List requirements. */
export async function GET() {
  const gate = await requireApiSession();
  if (!gate.ok) return gate.response;
  try {
    const { requirements } = await loadProjectRequirements();
    return NextResponse.json({ requirements: requirements.map(toApiRequirement) });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: String(e) } },
      { status: 500 }
    );
  }
}
