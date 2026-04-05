import { NextResponse } from "next/server";
import { loadProjectRequirements } from "@/lib/requirements-service";
import { requireApiSession } from "@/lib/require-api-session";

/** GRD-API-001: Validation summary. Same session gate as other /api routes when the auth adapter requires login. */
export async function GET() {
  const gate = await requireApiSession();
  if (!gate.ok) return gate.response;
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
