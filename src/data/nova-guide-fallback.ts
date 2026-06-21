import type { NovaGuideOpportunity, NovaGuideResponse } from "@/types/nova-guide";
import { NOVA_GUIDE_FALLBACK_SAFETY_NOTE } from "@/types/nova-guide";

const FALLBACK_STEPS = [
  "Open the official site for your strongest match and check current requirements.",
  "Save one scholarship or program to revisit with a counselor, mentor, or trusted adult.",
  "Pick one community or mentorship opportunity to explore this week.",
] as const;

const FALLBACK_QUESTIONS = [
  "What are the current deadlines?",
  "What documents or recommendations are needed?",
  "Is there a contact person or info session?",
] as const;

function buildFallbackWhyTheseFit(opportunities: NovaGuideOpportunity[]): string {
  if (opportunities.length === 0) {
    return "Your matches may reflect your selected interests, support needs, and background. Review each official site to see what may be relevant.";
  }

  const titles = opportunities.map((opportunity) => opportunity.title).join(", ");
  return `These matches — ${titles} — may fit based on your selections. Each is worth reviewing on its official site to see what support, timing, and next steps may be relevant for you.`;
}

export function buildFallbackNovaGuide(
  opportunities: NovaGuideOpportunity[],
): NovaGuideResponse {
  return {
    aiPowered: false,
    warmIntro: "Here is a simple starting plan based on your matches.",
    whyTheseFit: buildFallbackWhyTheseFit(opportunities),
    thisWeekSteps: [...FALLBACK_STEPS],
    questionsToAsk: [...FALLBACK_QUESTIONS],
    safetyNote: NOVA_GUIDE_FALLBACK_SAFETY_NOTE,
  };
}
