export type OpportunityLane = "financial" | "educational" | "professional";

export type Reliability = "verified-url" | "hand-curated" | "review-deadlines";

export type MatchStrength = "strong" | "good" | "explore";

export type Opportunity = {
  id: string;
  title: string;
  lane: OpportunityLane;
  url: string;
  region: string;
  ageRange: string[];
  communities: string[];
  interests: string[];
  supportTypes: string[];
  firstGenRelevant: boolean;
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
