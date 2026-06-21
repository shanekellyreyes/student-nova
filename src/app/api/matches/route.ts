import { getMatchesWithRedis } from "@/lib/match-service";
import { matchOpportunities } from "@/data/matcher";
import type { IntakeFormData, MatchApiResponse, RedisDegradedReason } from "@/types/opportunity";

export const runtime = "nodejs";

function isIntakeFormData(body: unknown): body is IntakeFormData {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  return (
    typeof value.city === "string" &&
    typeof value.ageRange === "string" &&
    typeof value.firstGen === "string" &&
    Array.isArray(value.identities) &&
    Array.isArray(value.interests) &&
    Array.isArray(value.supportNeeded)
  );
}

function degradedResponse(intake: IntakeFormData, reason: RedisDegradedReason): MatchApiResponse {
  return {
    ...matchOpportunities(intake),
    redis: {
      cacheHit: false,
      geoRanked: false,
      degraded: true,
      reason,
    },
  };
}

export async function POST(request: Request) {
  let intake: IntakeFormData;

  try {
    const body: unknown = await request.json();
    if (!isIntakeFormData(body)) {
      return Response.json({ error: "Invalid intake payload" }, { status: 400 });
    }
    intake = body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const response = await getMatchesWithRedis(intake);
    return Response.json(response);
  } catch {
    return Response.json(degradedResponse(intake, "redis_timeout"));
  }
}
