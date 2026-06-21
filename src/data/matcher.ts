import type {
  IntakeFormData,
  MatchResults,
  MatchStrength,
  Opportunity,
  Reliability,
  ScoredOpportunity,
} from "@/types/opportunity";
import { LANE_LABELS, opportunities } from "./opportunities";

const RELIABILITY_LABELS: Record<Reliability, string> = {
  "verified-url": "Hand-curated with a verified official link.",
  "hand-curated": "Hand-curated for Student Nova — review requirements before applying.",
  "review-deadlines": "Review deadlines and requirements on the official site.",
};

const COMMUNITY_CHIP_LABELS: Record<string, string> = {
  "Black / African American": "Black Community",
  "Latinx / Hispanic": "Latinx Community",
  "Native American / Indigenous": "Indigenous Community",
  "Pacific Islander": "Pacific Islander Community",
  "Asian / Asian American": "Asian Community",
  "Filipino / Filipino American": "Filipino Community",
  "Middle Eastern / North African": "MENA Community",
  "Woman in STEM": "Women in STEM",
  "LGBTQ+": "LGBTQ+ Community",
  "Disabled / neurodivergent": "Disability Community",
  "Veteran / military-connected": "Veteran Community",
};

const STRONG_MATCH_THRESHOLD = 1400;
const GOOD_MATCH_THRESHOLD = 600;

function countOverlap(selected: string[], tags: string[]): number {
  return selected.filter((item) => tags.includes(item)).length;
}

function getOverlap(selected: string[], tags: string[]): string[] {
  return selected.filter((item) => tags.includes(item));
}

function isYouthFriendly(opportunity: Opportunity): boolean {
  return opportunity.ageRange.includes("Under 16");
}

function countFilledFields(intake: IntakeFormData): number {
  let count = 0;
  if (intake.city) count++;
  if (intake.ageRange) count++;
  if (intake.firstGen === "yes" || intake.firstGen === "no") count++;
  if (intake.identities.length > 0) count++;
  if (intake.interests.length > 0) count++;
  if (intake.supportNeeded.length > 0) count++;
  return count;
}

function isSparseInput(intake: IntakeFormData): boolean {
  return countFilledFields(intake) <= 2;
}

function scoreRegion(region: string, city: string): number {
  if (!city) return 0;

  const r = region.toLowerCase();

  if (r.includes(city.toLowerCase())) return 6;
  if (r.includes("oakland") && city === "Oakland") return 6;
  if (r.includes("berkeley") && city === "Berkeley") return 6;
  if (r.includes("san francisco") && city === "San Francisco") return 6;
  if (r.includes("san jose") && city === "San Jose") return 6;
  if (r.includes("bay area")) return 4;
  if (r.includes("statewide ca")) return 3;
  if (r.includes("national") && r.includes("bay area")) return 2;
  if (r.includes("national")) return 1;

  return 0;
}

function formatSelectionList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getSelectionLabels(intake: IntakeFormData): string[] {
  const labels: string[] = [];

  if (intake.firstGen === "yes") labels.push("First-Generation");
  if (intake.city) labels.push(intake.city);
  if (intake.ageRange) labels.push(intake.ageRange);
  labels.push(...intake.interests);
  labels.push(...intake.supportNeeded);
  for (const identity of intake.identities) {
    if (identity !== "Prefer not to say") {
      labels.push(COMMUNITY_CHIP_LABELS[identity] ?? identity);
    }
  }

  return [...new Set(labels)];
}

function inferFocusPhrase(intake: IntakeFormData): string {
  const hasFirstGen = intake.firstGen === "yes";
  const techInterests = getOverlap(intake.interests, [
    "Computer Science",
    "Engineering",
    "AI / Data",
    "Cybersecurity",
  ]);
  const hasMentorship = intake.supportNeeded.includes("Mentorship");
  const hasCommunity = intake.supportNeeded.includes("Community");
  const hasScholarships = intake.supportNeeded.includes("Scholarships");
  const hasWorkshops = intake.supportNeeded.includes("Free workshops");
  const hasCity = intake.city !== "";

  if (hasFirstGen && techInterests.length > 0) {
    return "may support first-gen students entering technology fields";
  }
  if (hasCity && (hasMentorship || hasCommunity)) {
    return "may include strong Bay Area communities and mentoring programs";
  }
  if (hasScholarships) {
    return "may offer scholarships and financial support for STEM pathways";
  }
  if (hasWorkshops) {
    return "may include hands-on workshops and learning programs";
  }
  if (intake.identities.includes("Woman in STEM")) {
    return "may be relevant for women exploring STEM pathways";
  }
  if (intake.identities.includes("Latinx / Hispanic")) {
    return "may be relevant for Latinx students seeking STEM community and support";
  }
  if (intake.identities.includes("LGBTQ+")) {
    return "may be relevant for LGBTQ+ students seeking affirming STEM spaces";
  }
  if (hasMentorship) {
    return "may include mentorship and professional community";
  }
  return "may align with your goals, interests, and background";
}

export function buildPersonalizedSummary(intake: IntakeFormData, sparse: boolean): string {
  if (sparse) {
    return "We used broad STEM opportunities because you chose not to share much information.";
  }

  const selections = getSelectionLabels(intake);
  if (selections.length === 0) {
    return "We used broad STEM opportunities because you chose not to share much information.";
  }

  const focus = inferFocusPhrase(intake);
  const listed = formatSelectionList(selections.slice(0, 5));

  const verb =
    intake.supportNeeded.includes("Mentorship") ||
    intake.supportNeeded.includes("Community") ||
    intake.city
      ? "highlighted"
      : "prioritized";

  return `Because you selected ${listed}, we ${verb} opportunities that ${focus}.`;
}

function buildMatchReasonChips(opportunity: Opportunity, intake: IntakeFormData): string[] {
  const chips: string[] = [];

  if (intake.firstGen === "yes" && opportunity.firstGenRelevant) {
    chips.push("First-Gen Match");
  }

  if (intake.city) {
    const regionScore = scoreRegion(opportunity.region, intake.city);
    if (regionScore >= 4) {
      chips.push("Bay Area Match");
    } else if (regionScore > 0) {
      chips.push("Bay Area Match");
    }
  }

  for (const community of getOverlap(intake.identities, opportunity.communities)) {
    chips.push(COMMUNITY_CHIP_LABELS[community] ?? community);
  }

  for (const interest of getOverlap(intake.interests, opportunity.interests)) {
    chips.push(interest);
  }

  for (const support of getOverlap(intake.supportNeeded, opportunity.supportTypes)) {
    chips.push(support === "Free workshops" ? "Free Workshops" : support);
  }

  if (intake.ageRange === "Under 16" && isYouthFriendly(opportunity)) {
    chips.push("Youth-Friendly");
  }

  if (chips.length === 0 && isSparseInput(intake)) {
    chips.push("Broad STEM");
  }

  return [...new Set(chips)].slice(0, 3);
}

function getMatchStrength(score: number): MatchStrength {
  if (score >= STRONG_MATCH_THRESHOLD) return "strong";
  if (score >= GOOD_MATCH_THRESHOLD) return "good";
  return "explore";
}

function buildWhyMayFit(opportunity: Opportunity, intake: IntakeFormData, chips: string[]): string {
  if (chips.length === 0 || (chips.length === 1 && chips[0] === "Broad STEM")) {
    return `${opportunity.whyItMayFit} Review requirements on the official site.`;
  }

  const matchedInterests = getOverlap(intake.interests, opportunity.interests);
  const matchedSupport = getOverlap(intake.supportNeeded, opportunity.supportTypes);
  const matchedCommunities = getOverlap(intake.identities, opportunity.communities);

  const parts: string[] = [];

  if (intake.ageRange && opportunity.ageRange.includes(intake.ageRange)) {
    parts.push(`may be relevant for your age range (${intake.ageRange})`);
  }

  if (intake.city && scoreRegion(opportunity.region, intake.city) >= 4) {
    parts.push(`may serve students in ${intake.city}`);
  } else if (intake.city && scoreRegion(opportunity.region, intake.city) > 0) {
    parts.push("may be relevant across the Bay Area");
  }

  if (intake.firstGen === "yes" && opportunity.firstGenRelevant) {
    parts.push("may support first-generation students");
  }

  if (matchedCommunities.length > 0) {
    const label =
      matchedCommunities.length === 1
        ? (COMMUNITY_CHIP_LABELS[matchedCommunities[0]] ?? matchedCommunities[0])
        : "your community focus";
    parts.push(`may align with ${label}`);
  }

  if (matchedInterests.length > 0) {
    parts.push(`may match your interest in ${matchedInterests.slice(0, 2).join(" and ")}`);
  }

  if (matchedSupport.length > 0) {
    parts.push(`may offer ${matchedSupport.slice(0, 2).join(" and ")} support`);
  }

  const personalized =
    parts.length > 0
      ? `Based on what you shared, this resource ${parts.slice(0, 2).join(" and ")}.`
      : "";

  return `${personalized} ${opportunity.whyItMayFit}`.trim();
}

function scoreOpportunity(opportunity: Opportunity, intake: IntakeFormData): number {
  let score = 0;
  const sparse = isSparseInput(intake);

  if (intake.ageRange) {
    if (opportunity.ageRange.includes(intake.ageRange)) score += 800;
    if (intake.ageRange === "Under 16" && isYouthFriendly(opportunity)) score += 500;
  }

  if (intake.city) {
    score += scoreRegion(opportunity.region, intake.city) * 100;
  }

  if (intake.firstGen === "yes" && opportunity.firstGenRelevant) {
    score += 500;
  }

  score += countOverlap(intake.identities, opportunity.communities) * 400;
  score += countOverlap(intake.interests, opportunity.interests) * 400;
  score += countOverlap(intake.supportNeeded, opportunity.supportTypes) * 400;

  if (intake.interests.includes("Unsure, help me explore")) {
    if (
      opportunity.interests.includes("Unsure, help me explore") ||
      opportunity.supportTypes.includes("Community") ||
      opportunity.supportTypes.includes("Free workshops")
    ) {
      score += 200;
    }
  }

  if (sparse) {
    score += opportunity.firstGenRelevant ? 2 : 1;
  }

  return score;
}

function rankLane(lane: Opportunity["lane"], intake: IntakeFormData): ScoredOpportunity[] {
  return opportunities
    .filter((opportunity) => opportunity.lane === lane)
    .map((opportunity) => {
      const score = scoreOpportunity(opportunity, intake);
      const matchReasons = buildMatchReasonChips(opportunity, intake);
      return {
        ...opportunity,
        score,
        matchReasons,
        matchStrength: getMatchStrength(score),
        whyMayFit: buildWhyMayFit(opportunity, intake, matchReasons),
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 3);
}

export function getReliabilityLabel(reliability: Reliability): string {
  return RELIABILITY_LABELS[reliability];
}

export function matchOpportunities(intake: IntakeFormData): MatchResults {
  const sparse = isSparseInput(intake);
  const lanes: Opportunity["lane"][] = ["financial", "educational", "professional"];
  const laneResults = lanes.map((lane) => ({
    lane,
    label: LANE_LABELS[lane],
    opportunities: rankLane(lane, intake),
  }));

  const totalCount = laneResults.reduce((sum, lane) => sum + lane.opportunities.length, 0);

  return {
    isUnder16: intake.ageRange === "Under 16",
    isSparseInput: sparse,
    personalizedSummary: buildPersonalizedSummary(intake, sparse),
    totalCount,
    lanes: laneResults,
  };
}
