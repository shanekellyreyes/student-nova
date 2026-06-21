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

const GEO_BOOST = 150;

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

const SUPPORT_CHIP_LABELS: Record<string, string> = {
  Scholarships: "Scholarship",
  "Free workshops": "Free Workshops",
  Mentorship: "Mentorship",
  Internships: "Internship",
  Community: "Community",
  "Transfer support": "Transfer Support",
  Hackathons: "Hackathons",
};

const COMMUNITY_LEAD_PHRASES: Record<string, string[]> = {
  "Latinx / Hispanic": [
    "it serves Latinx students pursuing engineering and technology",
    "it may connect you with Latinx STEM community and support",
  ],
  "Black / African American": [
    "it centers Black students building technology, leadership, and confidence",
    "it may connect you with Black STEM community and mentorship",
  ],
  "Woman in STEM": [
    "it supports women and gender-expansive students exploring STEM fields",
    "it may offer community for women building technology careers",
  ],
  "LGBTQ+": [
    "it creates affirming space for LGBTQ+ students in STEM",
    "it may connect you with LGBTQ+ professionals and peers in tech",
  ],
  "Native American / Indigenous": [
    "it supports Indigenous students pursuing science and engineering pathways",
    "it may connect you with Native STEM community and scholarships",
  ],
  "Pacific Islander": [
    "it may support Pacific Islander students in STEM fields",
    "it connects Indigenous Pacific communities with science pathways",
  ],
  "Disabled / neurodivergent": [
    "it may support disabled and neurodivergent students entering STEM careers",
    "it connects students with disabilities to scholarships and employers",
  ],
};

type LeadKind =
  | "firstGen"
  | "cityStrong"
  | "cityBayArea"
  | "community"
  | "interest"
  | "support"
  | "youth"
  | "age"
  | "sparse";

type LeadSignal = {
  kind: LeadKind;
  weight: number;
  detail?: string;
};

function variantIndex(seed: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i)) % mod;
  }
  return hash;
}

function collectLeadSignals(opportunity: Opportunity, intake: IntakeFormData): LeadSignal[] {
  const signals: LeadSignal[] = [];

  if (intake.ageRange && opportunity.ageRange.includes(intake.ageRange)) {
    signals.push({ kind: "age", weight: 800, detail: intake.ageRange });
  }

  if (intake.ageRange === "Under 16" && isYouthFriendly(opportunity)) {
    signals.push({ kind: "youth", weight: 520 });
  }

  if (intake.city) {
    const regionScore = scoreRegion(opportunity.region, intake.city);
    if (regionScore >= 4) {
      signals.push({ kind: "cityStrong", weight: regionScore * 100, detail: intake.city });
    } else if (regionScore > 0) {
      signals.push({ kind: "cityBayArea", weight: regionScore * 100 });
    }
  }

  if (intake.firstGen === "yes" && opportunity.firstGenRelevant) {
    signals.push({ kind: "firstGen", weight: 500 });
  }

  for (const community of getOverlap(intake.identities, opportunity.communities)) {
    signals.push({ kind: "community", weight: 400, detail: community });
  }

  for (const interest of getOverlap(intake.interests, opportunity.interests)) {
    signals.push({ kind: "interest", weight: 400, detail: interest });
  }

  for (const support of getOverlap(intake.supportNeeded, opportunity.supportTypes)) {
    signals.push({ kind: "support", weight: 400, detail: support });
  }

  return signals.sort((a, b) => b.weight - a.weight);
}

function buildLeadSentence(
  signal: LeadSignal,
  opportunity: Opportunity,
  intake: IntakeFormData,
): string {
  const v = variantIndex(opportunity.id, 2);

  switch (signal.kind) {
    case "firstGen":
      return v === 0
        ? "This may fit because it explicitly supports first-generation or low-income students building a STEM pathway."
        : "This may fit because first-generation students are a core focus of this program.";

    case "cityStrong":
      return `This may fit because it has strong Bay Area roots and may be easier to explore from ${signal.detail}.`;

    case "cityBayArea":
      return intake.city
        ? `This may fit because it serves the broader Bay Area and may still be worth reviewing from ${intake.city}.`
        : "This may fit because it has Bay Area reach and may be relevant locally.";

    case "community": {
      const phrases = COMMUNITY_LEAD_PHRASES[signal.detail ?? ""];
      if (phrases) {
        return `This may fit because ${phrases[variantIndex(opportunity.id + signal.detail, phrases.length)]}.`;
      }
      const label = COMMUNITY_CHIP_LABELS[signal.detail ?? ""] ?? "your selected community";
      return `This may fit because it may align with ${label} students exploring STEM.`;
    }

    case "interest":
      return signal.detail === "Unsure, help me explore"
        ? "This may fit because it welcomes students who are still exploring STEM and want room to discover."
        : `This may fit because it connects directly to your interest in ${signal.detail}.`;

    case "support":
      if (signal.detail === "Mentorship") {
        return "This may fit because you asked for mentorship and this opportunity emphasizes community support.";
      }
      if (signal.detail === "Scholarships") {
        return "This may fit because you asked about scholarships and this program may offer financial support worth reviewing.";
      }
      if (signal.detail === "Free workshops") {
        return "This may fit because you asked for workshops and this program offers hands-on learning.";
      }
      if (signal.detail === "Internships") {
        return "This may fit because you asked for internships and this pathway may include real-world experience.";
      }
      if (signal.detail === "Community") {
        return "This may fit because you asked for community and this organization centers peer connection.";
      }
      return `This may fit because you asked for ${SUPPORT_CHIP_LABELS[signal.detail ?? ""] ?? signal.detail} support.`;

    case "youth":
      return "This may fit because it is designed with younger students in mind and may welcome under-16 learners.";

    case "age":
      return `This may fit because it may be relevant for your age range (${signal.detail}).`;

    case "sparse":
      return "This is a broad Bay Area STEM opportunity worth reviewing based on your open-ended search.";

    default:
      return "This may fit based on your selections and is worth reviewing.";
  }
}

function buildWhyMayFit(opportunity: Opportunity, intake: IntakeFormData, chips: string[]): string {
  const isSparseCard = chips.length === 1 && chips[0] === "Broad STEM";
  const signals = collectLeadSignals(opportunity, intake);

  let lead: string;

  if (isSparseCard || signals.length === 0) {
    lead = buildLeadSentence({ kind: "sparse", weight: 0 }, opportunity, intake);
  } else {
    lead = buildLeadSentence(signals[0], opportunity, intake);
  }

  return `${lead} ${opportunity.whyItMayFit}`.trim();
}

function buildMatchReasonChips(opportunity: Opportunity, intake: IntakeFormData): string[] {
  const chips: string[] = [];

  if (intake.firstGen === "yes" && opportunity.firstGenRelevant) {
    chips.push("First-Gen Match");
  }

  if (intake.city && scoreRegion(opportunity.region, intake.city) > 0) {
    chips.push("Bay Area Match");
  }

  for (const community of getOverlap(intake.identities, opportunity.communities)) {
    chips.push(COMMUNITY_CHIP_LABELS[community] ?? community);
  }

  for (const interest of getOverlap(intake.interests, opportunity.interests)) {
    chips.push(interest);
  }

  for (const support of getOverlap(intake.supportNeeded, opportunity.supportTypes)) {
    chips.push(SUPPORT_CHIP_LABELS[support] ?? support);
  }

  if (intake.ageRange === "Under 16" && isYouthFriendly(opportunity)) {
    chips.push("Youth Friendly");
  }

  if (chips.length === 0) {
    chips.push("Broad STEM");
  }

  return [...new Set(chips)].slice(0, 3);
}

function getMatchStrength(score: number): MatchStrength {
  if (score >= STRONG_MATCH_THRESHOLD) return "strong";
  if (score >= GOOD_MATCH_THRESHOLD) return "good";
  return "explore";
}

function scoreOpportunity(
  opportunity: Opportunity,
  intake: IntakeFormData,
  geoBoostIds?: ReadonlySet<string>,
): number {
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

  if (geoBoostIds?.has(opportunity.id)) {
    score += GEO_BOOST;
  }

  if (sparse) {
    score += opportunity.firstGenRelevant ? 2 : 1;
  }

  return score;
}

function rankLane(
  lane: Opportunity["lane"],
  intake: IntakeFormData,
  geoBoostIds?: ReadonlySet<string>,
): ScoredOpportunity[] {
  return opportunities
    .filter((opportunity) => opportunity.lane === lane)
    .map((opportunity) => {
      const score = scoreOpportunity(opportunity, intake, geoBoostIds);
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

export function matchOpportunities(
  intake: IntakeFormData,
  options?: { geoBoostIds?: ReadonlySet<string> },
): MatchResults {
  const sparse = isSparseInput(intake);
  const lanes: Opportunity["lane"][] = ["financial", "educational", "professional"];
  const geoBoostIds = options?.geoBoostIds;
  const laneResults = lanes.map((lane) => ({
    lane,
    label: LANE_LABELS[lane],
    opportunities: rankLane(lane, intake, geoBoostIds),
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
