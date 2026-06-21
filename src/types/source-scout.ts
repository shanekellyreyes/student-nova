export type SourceScoutDegradedReason =
  | "missing_api_key"
  | "missing_project_id"
  | "disabled"
  | "session_create_failed"
  | "browser_connect_failed"
  | "page_fetch_failed"
  | "timeout"
  | "unknown_error";

export type SourceScoutNoteStatus = "checked" | "fallback" | "failed";

export type SourceScoutNote = {
  opportunityId: string;
  title: string;
  sourceUrl: string;
  checkedAt: string;
  status: SourceScoutNoteStatus;
  pageTitle?: string;
  sourceExcerpt?: string;
  possibleDeadlineText?: string;
  sessionUrl?: string;
  reason?: string;
};

export type SourceScoutResponse = {
  browserbasePowered: boolean;
  degraded: boolean;
  reason?: SourceScoutDegradedReason;
  checkedAt: string;
  sessionUrl?: string;
  notes: SourceScoutNote[];
};

export type SourceScoutRequest = {
  opportunityIds?: string[];
};

export const SOURCE_SCOUT_MAX_URLS = 5;
