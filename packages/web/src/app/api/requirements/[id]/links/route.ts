import { NextResponse } from "next/server";
import { patchRequirementLinks, toApiRequirement } from "@/lib/requirements-service";

/** GRD-API-001: Add or remove a link entry. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } },
        { status: 400 }
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: { code: "INVALID_BODY", message: "Request body must be an object." } },
        { status: 400 }
      );
    }
    const payload = body as Record<string, unknown>;
    const operation = payload.operation;
    const link = payload.link;
    if ((operation !== "add" && operation !== "remove") || !link || typeof link !== "object") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_BODY",
            message: 'Body must include "operation" ("add"|"remove") and a "link" object.',
          },
        },
        { status: 400 }
      );
    }

    const result = await patchRequirementLinks(id, operation, link as Record<string, unknown>);
    if (!result.ok) {
      const status = result.code === "NOT_FOUND" ? 404 : result.code === "LINK_NOT_FOUND" ? 404 : 500;
      return NextResponse.json({ error: { code: result.code, message: result.message } }, { status });
    }
    return NextResponse.json({ requirement: toApiRequirement(result.requirement) });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: String(e) } },
      { status: 500 }
    );
  }
}
