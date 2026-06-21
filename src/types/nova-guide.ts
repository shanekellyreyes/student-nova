import type { IntakeFormData, OpportunityLane } from "@/types/opportunity";

export type NovaGuideOpportunity = {
  id: string;
  title: string;
  lane: OpportunityLane;
  description: string;
  whyItMayFit: string;
  url: string;
  badges: string[];
};

export type NovaGuideRequest = {
  profile: IntakeFormData;
  topOpportunities: NovaGuideOpportunity[];
};

export type NovaGuideResponse = {
  aiPowered: boolean;
  warmIntro: string;
  whyTheseFit: string;
  thisWeekSteps: string[];
  questionsToAsk: string[];
  safetyNote: string;
};

export const NOVA_GUIDE_AI_SAFETY_NOTE =
  "Nova Guide is AI-assisted planning support, not an eligibility decision. Verify requirements on the official site.";

export const NOVA_GUIDE_FALLBACK_SAFETY_NOTE =
  "Nova Guide is planning support, not an eligibility decision. Verify requirements on the official site.";

export const NOVA_GUIDE_MAX_OPPORTUNITIES = 3;
