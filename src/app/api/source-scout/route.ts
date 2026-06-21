import { runSourceScout } from "@/lib/source-scout";
import type { SourceScoutRequest } from "@/types/source-scout";
import { SOURCE_SCOUT_MAX_URLS } from "@/types/source-scout";

export const runtime = "nodejs";

function parseRequestBody(body: unknown): SourceScoutRequest {
  if (!body || typeof body !== "object") return {};

  const value = body as Record<string, unknown>;
  if (!Array.isArray(value.opportunityIds)) return {};

  const opportunityIds = value.opportunityIds
    .filter((id): id is string => typeof id === "string")
    .slice(0, SOURCE_SCOUT_MAX_URLS);

  return { opportunityIds };
}

export async function POST(request: Request) {
  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { opportunityIds } = parseRequestBody(body);
  const response = await runSourceScout(opportunityIds);
  return Response.json(response);
}
