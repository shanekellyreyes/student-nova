import type { IntakeFormData, Opportunity } from "@/types/opportunity";
import { LOW_INCOME_TAG, UNDERREPRESENTED_TAG } from "@/data/opportunity-normalize";

export { UNDERREPRESENTED_TAG, LOW_INCOME_TAG };

export const COMMUNITY_WEIGHTS = {
  primary: 780,
  secondary: 460,
  broadUnderrepresented: 320,
  lowIncomeAccess: 280,
  openToAll: 60,
  mismatchPenalty: 420,
  mismatchInterestFactor: 0.2,
  mismatchSupportFactor: 0.2,
} as const;

export const COMMUNITY_CHIP_LABELS: Record<string, string> = {
  "Black / African American": "Black STEM Community",
  "Latinx / Hispanic": "Latinx STEM Community",
  "Native American / Indigenous": "Native / Indigenous STEM",
  "Pacific Islander": "Pacific Islander Community",
  "Asian / Asian American": "Filipino / AAPI Community",
  "Filipino / Filipino American": "Filipino / AAPI Community",
  "Middle Eastern / North African": "MENA Community",
  "Woman in STEM": "Women in STEM",
  "LGBTQ+": "LGBTQ+ Community",
  "Disabled / neurodivergent": "Disability-Inclusive",
  "Veteran / military-connected": "Veteran / Military-Connected",
};

export function getSelectedIdentities(identities: string[]): string[] {
  return identities.filter((identity) => identity !== "Prefer not to say");
}

export function hasIdentityMismatch(
  opportunity: Opportunity,
  selectedIdentities: string[],
): boolean {
  const identities = getSelectedIdentities(selectedIdentities);
  if (identities.length === 0) return false;
  if (opportunity.openToAll) return false;
  if (opportunity.primaryCommunities.length === 0) return false;

  const matchesPrimary = identities.some((id) => opportunity.primaryCommunities.includes(id));
  const matchesSecondary = identities.some((id) => opportunity.secondaryCommunities.includes(id));

  return !matchesPrimary && !matchesSecondary;
}

function wantsAccessSupport(intake: IntakeFormData): boolean {
  return (
    intake.firstGen === "yes" ||
    intake.supportNeeded.includes("Scholarships") ||
    intake.supportNeeded.includes("Transfer support")
  );
}

export function scoreCommunityMatch(
  opportunity: Opportunity,
  intake: IntakeFormData,
): { score: number; matchedIdentities: string[] } {
  const selectedIdentities = intake.identities;
  const identities = getSelectedIdentities(selectedIdentities);
  let score = 0;
  const matchedIdentities: string[] = [];

  if (identities.length === 0) {
    if (opportunity.openToAll) {
      score += COMMUNITY_WEIGHTS.openToAll;
    }
    return { score, matchedIdentities };
  }

  for (const identity of identities) {
    if (opportunity.primaryCommunities.includes(identity)) {
      score += COMMUNITY_WEIGHTS.primary;
      matchedIdentities.push(identity);
    } else if (opportunity.secondaryCommunities.includes(identity)) {
      score += COMMUNITY_WEIGHTS.secondary;
      matchedIdentities.push(identity);
    }
  }

  if (
    opportunity.primaryCommunities.length === 0 &&
    opportunity.secondaryCommunities.includes(UNDERREPRESENTED_TAG) &&
    matchedIdentities.length === 0
  ) {
    score += COMMUNITY_WEIGHTS.broadUnderrepresented;
  }

  if (
    opportunity.secondaryCommunities.includes(LOW_INCOME_TAG) &&
    wantsAccessSupport(intake) &&
    matchedIdentities.length === 0
  ) {
    score += COMMUNITY_WEIGHTS.lowIncomeAccess;
  }

  if (opportunity.openToAll) {
    score += COMMUNITY_WEIGHTS.openToAll;
  }

  if (hasIdentityMismatch(opportunity, selectedIdentities)) {
    score -= COMMUNITY_WEIGHTS.mismatchPenalty;
  }

  return { score, matchedIdentities: [...new Set(matchedIdentities)] };
}
