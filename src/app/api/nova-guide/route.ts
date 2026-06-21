import { buildFallbackNovaGuide, generateNovaGuide } from "@/lib/nova-guide";
import type { IntakeFormData } from "@/types/opportunity";
import type { NovaGuideOpportunity, NovaGuideRequest } from "@/types/nova-guide";
import { NOVA_GUIDE_MAX_OPPORTUNITIES } from "@/types/nova-guide";

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

function isNovaGuideOpportunity(value: unknown): value is NovaGuideOpportunity {
  if (!value || typeof value !== "object") return false;
  const opportunity = value as Record<string, unknown>;
  return (
    typeof opportunity.id === "string" &&
    typeof opportunity.title === "string" &&
    (opportunity.lane === "financial" ||
      opportunity.lane === "educational" ||
      opportunity.lane === "professional") &&
    typeof opportunity.description === "string" &&
    typeof opportunity.whyItMayFit === "string" &&
    typeof opportunity.url === "string" &&
    Array.isArray(opportunity.badges) &&
    opportunity.badges.every((badge) => typeof badge === "string")
  );
}

function isNovaGuideRequest(body: unknown): body is NovaGuideRequest {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  return (
    isIntakeFormData(value.profile) &&
    Array.isArray(value.topOpportunities) &&
    value.topOpportunities.length > 0 &&
    value.topOpportunities.length <= NOVA_GUIDE_MAX_OPPORTUNITIES &&
    value.topOpportunities.every(isNovaGuideOpportunity)
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isNovaGuideRequest(body)) {
      return Response.json({ error: "Invalid Nova Guide payload" }, { status: 400 });
    }

    const guide = await generateNovaGuide(body.profile, body.topOpportunities);
    return Response.json(guide);
  } catch {
    return Response.json(buildFallbackNovaGuide([]));
  }
}
