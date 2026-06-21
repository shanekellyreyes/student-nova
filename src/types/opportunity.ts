export type OpportunityLane = "financial" | "educational" | "professional";

export type Reliability = "verified-url" | "hand-curated" | "review-deadlines";

export type MatchStrength = "strong" | "good" | "explore";

export type LocationScope = "city" | "bay-area" | "california" | "national";

export type FirstGenFocus = "primary" | "secondary" | "none";

/** Seeded opportunity before location/first-gen metadata enrichment */
export type OpportunitySeed = Omit<
  Opportunity,
  "serviceAreas" | "locationScope" | "firstGenFocus"
> & {
  serviceAreas?: string[];
  locationScope?: LocationScope;
  firstGenFocus?: FirstGenFocus;
};

export type Opportunity = {
  id: string;
  title: string;
  lane: OpportunityLane;
  url: string;
  region: string;
  /** Approximate service areas derived from region text */
  serviceAreas: string[];
  locationScope: LocationScope;
  primaryCity?: string;
  ageRange: string[];
  /** Identity-specific primary audiences */
  primaryCommunities: string[];
  /** Broad underrepresented or multi-community support (may include "Underrepresented") */
  secondaryCommunities: string[];
  /** Open to students regardless of identity */
  openToAll: boolean;
  /** Communities that may appear as match chips when selected by the user */
  communities: string[];
  interests: string[];
  supportTypes: string[];
  firstGenRelevant: boolean;
  /** How strongly the opportunity centers first-generation support */
  firstGenFocus: FirstGenFocus;
  description: string;
  whyItMayFit: string;
  reliability: Reliability;
  badges: string[];
};

export type IntakeFormData = {
  city: string;
  ageRange: string;
  firstGen: string;
  identities: string[];
  interests: string[];
  supportNeeded: string[];
};

export type ScoredOpportunity = Opportunity & {
  score: number;
  whyMayFit: string;
  matchReasons: string[];
  matchStrength: MatchStrength;
};

export type LaneResults = {
  lane: OpportunityLane;
  label: string;
  opportunities: ScoredOpportunity[];
};

export type MatchResults = {
  lanes: LaneResults[];
  isUnder16: boolean;
  isSparseInput: boolean;
  personalizedSummary: string;
  totalCount: number;
};

export type RedisDegradedReason =
  | "missing_env"
  | "connect_failed"
  | "redis_timeout"
  | "cache_read_failed"
  | "cache_write_failed";

export type RedisStatus = {
  cacheHit: boolean;
  geoRanked: boolean;
  degraded: boolean;
  reason?: RedisDegradedReason;
};

export type MatchApiResponse = MatchResults & {
  redis: RedisStatus;
};

export const MATCH_STRENGTH_LABELS: Record<MatchStrength, string> = {
  strong: "Strong Match",
  good: "Good Match",
  explore: "Worth Exploring",
};
