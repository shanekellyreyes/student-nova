import type { Opportunity, OpportunitySeed } from "@/types/opportunity";
import type { SaiOpportunity, SaiReliability } from "../../docs/sai-additional-opportunities";
import {
  deriveFirstGenFocus,
  deriveLocationFromRegion,
} from "@/data/opportunity-metadata";

export const UNDERREPRESENTED_TAG = "Underrepresented";
export const LOW_INCOME_TAG = "Low-income";

const IDENTITY_COMMUNITIES = [
  "Black / African American",
  "Latinx / Hispanic",
  "Native American / Indigenous",
  "Pacific Islander",
  "Asian / Asian American",
  "Filipino / Filipino American",
  "Middle Eastern / North African",
  "Woman in STEM",
  "LGBTQ+",
  "Disabled / neurodivergent",
  "Veteran / military-connected",
] as const;

const IDENTITY_SET = new Set<string>(IDENTITY_COMMUNITIES);

function mapReliability(reliability: SaiReliability): Opportunity["reliability"] {
  if (reliability === "verified-live" || reliability === "verified-url") return "verified-url";
  if (reliability === "verify-url" || reliability === "hand-curated") return "hand-curated";
  return reliability;
}

function splitCommunityTags(tags: string[]): {
  identities: string[];
  accessTags: string[];
} {
  const identities: string[] = [];
  const accessTags: string[] = [];

  for (const tag of tags) {
    if (tag === "First-generation" || tag === "All") continue;
    if (IDENTITY_SET.has(tag)) {
      identities.push(tag);
    } else if (tag === UNDERREPRESENTED_TAG || tag === LOW_INCOME_TAG) {
      accessTags.push(tag);
    }
  }

  return { identities, accessTags };
}

function mergeCommunities(
  primary: string[],
  secondary: string[],
): Pick<Opportunity, "primaryCommunities" | "secondaryCommunities" | "communities"> {
  const primarySplit = splitCommunityTags(primary);
  const secondarySplit = splitCommunityTags(secondary);

  const primaryCommunities = [...new Set(primarySplit.identities)];
  const secondaryCommunities = [
    ...new Set([
      ...secondarySplit.identities,
      ...primarySplit.accessTags,
      ...secondarySplit.accessTags,
    ]),
  ];

  const communities = [
    ...new Set([
      ...primaryCommunities,
      ...secondaryCommunities.filter((tag) => IDENTITY_SET.has(tag)),
    ]),
  ];

  return { primaryCommunities, secondaryCommunities, communities };
}

function mapFirstGenRelevance(relevance: SaiOpportunity["firstGenRelevance"]): boolean {
  return relevance === "high" || relevance === "moderate";
}

export function enrichOpportunityMetadata(opportunity: Opportunity): Opportunity {
  const location = deriveLocationFromRegion(opportunity.region);
  const firstGenFocus = deriveFirstGenFocus(opportunity);

  return {
    ...opportunity,
    serviceAreas: location.serviceAreas,
    locationScope: location.locationScope,
    primaryCity: location.primaryCity,
    firstGenFocus,
  };
}

export function normalizeSaiOpportunity(input: SaiOpportunity): Opportunity {
  const communities = mergeCommunities(input.primaryCommunities, input.secondaryCommunities);

  const base: Opportunity = {
    id: input.id,
    title: input.title,
    lane: input.lane,
    url: input.url,
    region: input.region,
    serviceAreas: [],
    locationScope: "national",
    ageRange: input.ageRange,
    primaryCommunities: communities.primaryCommunities,
    secondaryCommunities: communities.secondaryCommunities,
    openToAll: input.openToAll,
    communities: communities.communities,
    interests: input.interests,
    supportTypes: input.supportTypes,
    firstGenRelevant: mapFirstGenRelevance(input.firstGenRelevance),
    firstGenFocus: "none",
    description: input.description,
    whyItMayFit: input.whyItMayFit,
    reliability: mapReliability(input.reliability),
    badges: input.badges,
  };

  return enrichOpportunityMetadata(base);
}

/** Backfill legacy records that only had `communities` populated. */
export function ensureOpportunityFields(opportunity: OpportunitySeed): Opportunity {
  if (
    opportunity.primaryCommunities.length > 0 ||
    opportunity.secondaryCommunities.length > 0 ||
    opportunity.openToAll
  ) {
    return enrichOpportunityMetadata({
      ...opportunity,
      serviceAreas: opportunity.serviceAreas ?? [],
      locationScope: opportunity.locationScope ?? "national",
      firstGenFocus: opportunity.firstGenFocus ?? deriveFirstGenFocus(opportunity),
      communities:
        opportunity.communities.length > 0
          ? opportunity.communities
          : [...opportunity.primaryCommunities],
    });
  }

  const legacy = splitCommunityTags(opportunity.communities);
  const primaryCommunities = legacy.identities;
  const secondaryCommunities = [...legacy.accessTags];

  if (primaryCommunities.length === 0 && opportunity.firstGenRelevant) {
    secondaryCommunities.push(UNDERREPRESENTED_TAG);
  }

  return enrichOpportunityMetadata({
    ...opportunity,
    primaryCommunities,
    secondaryCommunities: [...new Set(secondaryCommunities)],
    openToAll: opportunity.openToAll ?? false,
    communities: opportunity.communities.length > 0 ? opportunity.communities : primaryCommunities,
    serviceAreas: opportunity.serviceAreas ?? [],
    locationScope: opportunity.locationScope ?? "national",
    primaryCity: opportunity.primaryCity,
    firstGenFocus: opportunity.firstGenFocus ?? "none",
  });
}
