import type { AgeTag, IntakeFormData, MatchResults, Opportunity, ScoredOpportunity } from "@/types/opportunity";
import { LANE_LABELS, opportunities } from "./opportunities";

const AGE_RANGE_TO_TAG: Record<string, AgeTag> = {
  "Under 16": "under-16",
  "16–17": "16-17",
  "18–24": "18-24",
  "25+": "25-plus",
};

function countOverlap(selected: string[], tags: string[]): number {
  return selected.filter((item) => tags.includes(item)).length;
}

function buildWhyMayFit(opportunity: Opportunity, intake: IntakeFormData): string {
  const reasons: string[] = [];

  if (intake.city && opportunity.cityTags.includes(intake.city)) {
    reasons.push(`may be relevant for students in ${intake.city}`);
  }

  const ageTag = AGE_RANGE_TO_TAG[intake.ageRange];
  if (ageTag && opportunity.ageTags.includes(ageTag)) {
    reasons.push("worth reviewing for your age range");
  }

  if (intake.firstGen === "yes" && opportunity.firstGenFriendly) {
    reasons.push("often supports first-generation students");
  }

  if (
    intake.identities.includes("Veteran / military-connected") &&
    opportunity.veteranFriendly
  ) {
    reasons.push("may connect with veteran and military-connected communities");
  }

  const communityOverlap = countOverlap(intake.identities, opportunity.communityTags);
  if (communityOverlap > 0) {
    reasons.push("may align with your community focus");
  }

  const interestOverlap = countOverlap(intake.interests, opportunity.interestTags);
  if (interestOverlap > 0) {
    reasons.push("may match your STEM interests");
  }

  const supportOverlap = countOverlap(intake.supportNeeded, opportunity.supportTags);
  if (supportOverlap > 0) {
    reasons.push("may offer the kind of support you are looking for");
  }

  if (intake.ageRange === "Under 16" && opportunity.youthFriendly) {
    reasons.push("designed with younger students in mind");
  }

  if (reasons.length === 0) {
    return `${opportunity.whyItMatters} Verify requirements on the official site.`;
  }

  return `This resource ${reasons.slice(0, 2).join(" and ")}. ${opportunity.whyItMatters}`;
}

function scoreOpportunity(opportunity: Opportunity, intake: IntakeFormData): number {
  let score = 0;
  const hasAnyInput =
    intake.city !== "" ||
    intake.ageRange !== "" ||
    intake.firstGen !== "" ||
    intake.identities.length > 0 ||
    intake.interests.length > 0 ||
    intake.supportNeeded.length > 0;

  if (intake.city) {
    if (opportunity.cityTags.includes(intake.city)) {
      score += 5;
    } else if (opportunity.cityTags.includes("Other Bay Area")) {
      score += 2;
    }
  }

  const ageTag = AGE_RANGE_TO_TAG[intake.ageRange];
  if (ageTag) {
    if (opportunity.ageTags.includes(ageTag)) {
      score += 5;
    }
    if (intake.ageRange === "Under 16" && opportunity.youthFriendly) {
      score += 4;
    }
  }

  if (intake.firstGen === "yes" && opportunity.firstGenFriendly) {
    score += 4;
  }

  if (
    intake.identities.includes("Veteran / military-connected") &&
    opportunity.veteranFriendly
  ) {
    score += 4;
  }

  score += countOverlap(intake.identities, opportunity.communityTags) * 3;
  score += countOverlap(intake.interests, opportunity.interestTags) * 3;
  score += countOverlap(intake.supportNeeded, opportunity.supportTags) * 3;

  if (intake.interests.includes("Unsure, help me explore")) {
    if (
      opportunity.interestTags.includes("Unsure, help me explore") ||
      opportunity.supportTags.includes("Community") ||
      opportunity.supportTags.includes("Free workshops")
    ) {
      score += 2;
    }
  }

  if (!hasAnyInput) {
    score += opportunity.youthFriendly ? 1 : 2;
  }

  return score;
}

function rankLane(lane: Opportunity["lane"], intake: IntakeFormData): ScoredOpportunity[] {
  return opportunities
    .filter((opportunity) => opportunity.lane === lane)
    .map((opportunity) => {
      const score = scoreOpportunity(opportunity, intake);
      return {
        ...opportunity,
        score,
        whyMayFit: buildWhyMayFit(opportunity, intake),
      };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 3);
}

export function matchOpportunities(intake: IntakeFormData): MatchResults {
  const lanes: Opportunity["lane"][] = ["financial", "educational", "professional"];

  return {
    isUnder16: intake.ageRange === "Under 16",
    lanes: lanes.map((lane) => ({
      lane,
      label: LANE_LABELS[lane],
      opportunities: rankLane(lane, intake),
    })),
  };
}
