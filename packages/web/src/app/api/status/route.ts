import { NextResponse } from "next/server";
import { loadProjectRequirements } from "@/lib/requirements-service";

/** GRD-API-001: Validation summary. */
export async function GET() {
  try {
    const { requirements, errors } = await loadProjectRequirements();
    return NextResponse.json({
      requirementCount: requirements.length,
      errors,
    });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: String(e) } },
      { status: 500 }
    );
  }
}
