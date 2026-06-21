import type { IntakeFormData, Opportunity } from "@/types/opportunity";
import type { FirstGenFocus } from "@/data/opportunity-metadata";

export const FIRST_GEN_WEIGHTS = {
  yesBoostPrimary: 520,
  yesBoostSecondary: 460,
  noPenaltyPrimary: 200,
  noPenaltySecondary: 80,
} as const;

export type FirstGenMatch = {
  score: number;
  showChip: boolean;
};

function hasNonFirstGenSignals(opportunity: Opportunity, intake: IntakeFormData): boolean {
  const identityOverlap = intake.identities.some(
    (identity) =>
      identity !== "Prefer not to say" &&
      (opportunity.primaryCommunities.includes(identity) ||
        opportunity.secondaryCommunities.includes(identity)),
  );
  const interestOverlap = intake.interests.some((interest) =>
    opportunity.interests.includes(interest),
  );
  const supportOverlap = intake.supportNeeded.some((support) =>
    opportunity.supportTypes.includes(support),
  );

  return identityOverlap || interestOverlap || supportOverlap;
}

export function scoreFirstGenMatch(opportunity: Opportunity, intake: IntakeFormData): FirstGenMatch {
  const focus: FirstGenFocus = opportunity.firstGenFocus;

  if (intake.firstGen === "yes") {
    if (!opportunity.firstGenRelevant) {
      return { score: 0, showChip: false };
    }
    return {
      score:
        focus === "primary"
          ? FIRST_GEN_WEIGHTS.yesBoostPrimary
          : FIRST_GEN_WEIGHTS.yesBoostSecondary,
      showChip: true,
    };
  }

  if (intake.firstGen === "no") {
    if (!opportunity.firstGenRelevant) {
      return { score: 0, showChip: false };
    }

    if (hasNonFirstGenSignals(opportunity, intake)) {
      return { score: 0, showChip: false };
    }

    if (focus === "primary") {
      return { score: -FIRST_GEN_WEIGHTS.noPenaltyPrimary, showChip: false };
    }

    if (focus === "secondary") {
      return { score: -FIRST_GEN_WEIGHTS.noPenaltySecondary, showChip: false };
    }

    return { score: 0, showChip: false };
  }

  return { score: 0, showChip: false };
}

export function shouldShowFirstGenChip(opportunity: Opportunity, intake: IntakeFormData): boolean {
  return intake.firstGen === "yes" && opportunity.firstGenRelevant;
}
