export type OpportunityLane = "financial" | "educational" | "professional";

export type AgeTag = "under-16" | "16-17" | "18-24" | "25-plus";

export type Opportunity = {
  id: string;
  title: string;
  lane: OpportunityLane;
  cityTags: string[];
  ageTags: AgeTag[];
  communityTags: string[];
  interestTags: string[];
  supportTags: string[];
  firstGenFriendly: boolean;
  veteranFriendly: boolean;
  youthFriendly: boolean;
  description: string;
  whyItMatters: string;
  url: string;
  sourceName: string;
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
};

export type LaneResults = {
  lane: OpportunityLane;
  label: string;
  opportunities: ScoredOpportunity[];
};

export type MatchResults = {
  lanes: LaneResults[];
  isUnder16: boolean;
};
