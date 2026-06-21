import "server-only";

import type { IntakeFormData } from "@/types/opportunity";
import type { NovaGuideOpportunity, NovaGuideResponse } from "@/types/nova-guide";
import { NOVA_GUIDE_AI_SAFETY_NOTE } from "@/types/nova-guide";
import { buildFallbackNovaGuide } from "@/data/nova-guide-fallback";
import { getOpenAiClient, getOpenAiModel, isOpenAiConfigured } from "@/lib/openai";

export { buildFallbackNovaGuide };

const OPENAI_TIMEOUT_MS = 12_000;

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function devLog(message: string, meta?: Record<string, string | boolean>) {
  if (!isDev()) return;
  if (meta) {
    console.log(`[nova-guide] ${message}`, meta);
  } else {
    console.log(`[nova-guide] ${message}`);
  }
}

function trimText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function trimStringArray(value: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function buildPrompt(profile: IntakeFormData, opportunities: NovaGuideOpportunity[]) {
  const opportunityLines = opportunities
    .map(
      (opportunity, index) =>
        `${index + 1}. ${opportunity.title} (${opportunity.lane})\n` +
        `   Why it may fit: ${opportunity.whyItMayFit}\n` +
        `   URL: ${opportunity.url}\n` +
        `   Badges: ${opportunity.badges.join(", ") || "none"}`,
    )
    .join("\n");

  const profileSummary = {
    city: profile.city || "not shared",
    ageRange: profile.ageRange || "not shared",
    firstGen: profile.firstGen || "not shared",
    identities: profile.identities.length > 0 ? profile.identities : ["not shared"],
    interests: profile.interests.length > 0 ? profile.interests : ["not shared"],
    supportNeeded: profile.supportNeeded.length > 0 ? profile.supportNeeded : ["not shared"],
  };

  return {
    system: `You are Nova Guide for Student Nova, helping Bay Area students take short next steps with STEM opportunities they already matched.

Rules:
- Mention ONLY the programs listed in MATCHED OPPORTUNITIES.
- Do not invent programs, deadlines, dates, or eligibility claims.
- Never say "you qualify."
- Use phrasing like "may fit", "worth reviewing", "verify requirements", and "official site".
- Keep the full response readable in under 45 seconds.
- Be practical for first-generation or underrepresented students.
- Return JSON only with keys: warmIntro, whyTheseFit, thisWeekSteps, questionsToAsk, safetyNote.
- thisWeekSteps: exactly 3 short action steps.
- questionsToAsk: exactly 3 short questions.
- safetyNote must be exactly: "${NOVA_GUIDE_AI_SAFETY_NOTE}"`,
    user: `STUDENT PROFILE:
${JSON.stringify(profileSummary)}

MATCHED OPPORTUNITIES (use only these):
${opportunityLines}`,
  };
}

function normalizeAiGuide(raw: unknown, opportunities: NovaGuideOpportunity[]): NovaGuideResponse | null {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as Record<string, unknown>;
  const warmIntro = trimText(data.warmIntro, 280);
  const whyTheseFit = trimText(data.whyTheseFit, 420);
  const thisWeekSteps = trimStringArray(data.thisWeekSteps, 3, 180);
  const questionsToAsk = trimStringArray(data.questionsToAsk, 3, 120);
  const safetyNote = trimText(data.safetyNote, 220);

  if (!warmIntro || !whyTheseFit || thisWeekSteps.length !== 3 || questionsToAsk.length !== 3) {
    return null;
  }

  return {
    aiPowered: true,
    warmIntro,
    whyTheseFit,
    thisWeekSteps,
    questionsToAsk,
    safetyNote: safetyNote || NOVA_GUIDE_AI_SAFETY_NOTE,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("OpenAI request timed out")), ms);
    }),
  ]);
}

export async function generateNovaGuide(
  profile: IntakeFormData,
  opportunities: NovaGuideOpportunity[],
): Promise<NovaGuideResponse> {
  if (opportunities.length === 0) {
    return buildFallbackNovaGuide(opportunities);
  }

  if (!isOpenAiConfigured()) {
    devLog("fallback", { reason: "missing_api_key" });
    return buildFallbackNovaGuide(opportunities);
  }

  const client = getOpenAiClient();
  if (!client) {
    devLog("fallback", { reason: "client_unavailable" });
    return buildFallbackNovaGuide(opportunities);
  }

  const { system, user } = buildPrompt(profile, opportunities);

  try {
    const completion = await withTimeout(
      client.chat.completions.create({
        model: getOpenAiModel(),
        temperature: 0.4,
        max_tokens: 450,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      OPENAI_TIMEOUT_MS,
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      devLog("fallback", { reason: "empty_response" });
      return buildFallbackNovaGuide(opportunities);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      devLog("fallback", { reason: "invalid_json" });
      return buildFallbackNovaGuide(opportunities);
    }

    const normalized = normalizeAiGuide(parsed, opportunities);
    if (!normalized) {
      devLog("fallback", { reason: "validation_failed" });
      return buildFallbackNovaGuide(opportunities);
    }

    devLog("success", { aiPowered: true });
    return normalized;
  } catch (error) {
    devLog("fallback", {
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    return buildFallbackNovaGuide(opportunities);
  }
}
