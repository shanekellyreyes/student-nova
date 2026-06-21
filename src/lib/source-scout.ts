import "server-only";

import { opportunities } from "@/data/opportunities";
import {
  checkOfficialSourcesWithBrowserbase,
  getBrowserbaseConfigSnapshot,
  getBrowserbaseDisabledReason,
  type OfficialSourceTarget,
} from "@/lib/browserbase";
import type { SourceScoutDegradedReason, SourceScoutNote, SourceScoutResponse } from "@/types/source-scout";
import { SOURCE_SCOUT_MAX_URLS } from "@/types/source-scout";

const OPPORTUNITY_BY_ID = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));
const FALLBACK_NOTE_REASON = "Live refresh unavailable — showing seeded official links";

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function devLog(message: string, meta?: Record<string, string | number | boolean>) {
  if (!isDev()) return;
  if (meta) {
    console.log(`[source-scout] ${message}`, meta);
  } else {
    console.log(`[source-scout] ${message}`);
  }
}

function toTarget(opportunity: (typeof opportunities)[number]): OfficialSourceTarget {
  return {
    opportunityId: opportunity.id,
    title: opportunity.title,
    sourceUrl: opportunity.url,
  };
}

export function resolveSourceScoutTargets(opportunityIds?: string[]): OfficialSourceTarget[] {
  const uniqueIds = [...new Set(opportunityIds ?? [])].filter((id) => OPPORTUNITY_BY_ID.has(id));

  const selected =
    uniqueIds.length > 0
      ? uniqueIds
          .map((id) => OPPORTUNITY_BY_ID.get(id))
          .filter((opportunity): opportunity is (typeof opportunities)[number] => Boolean(opportunity))
      : opportunities.slice(0, SOURCE_SCOUT_MAX_URLS);

  return selected.slice(0, SOURCE_SCOUT_MAX_URLS).map(toTarget);
}

function buildFallbackNotes(targets: OfficialSourceTarget[], checkedAt: string): SourceScoutNote[] {
  return targets.map((target) => ({
    opportunityId: target.opportunityId,
    title: target.title,
    sourceUrl: target.sourceUrl,
    checkedAt,
    status: "fallback",
    reason: FALLBACK_NOTE_REASON,
  }));
}

function buildDegradedResponse(
  checkedAt: string,
  targets: OfficialSourceTarget[],
  reason: SourceScoutDegradedReason,
  notes?: SourceScoutNote[],
  sessionUrl?: string,
): SourceScoutResponse {
  return {
    browserbasePowered: notes?.some((note) => note.status === "checked") ?? false,
    degraded: true,
    reason,
    checkedAt,
    sessionUrl,
    notes: notes ?? buildFallbackNotes(targets, checkedAt),
  };
}

export async function runSourceScout(opportunityIds?: string[]): Promise<SourceScoutResponse> {
  const checkedAt = new Date().toISOString();
  const config = getBrowserbaseConfigSnapshot();
  devLog("config", config);

  const targets = resolveSourceScoutTargets(opportunityIds);

  if (targets.length === 0) {
    return buildDegradedResponse(checkedAt, [], "unknown_error", []);
  }

  const disabledReason = getBrowserbaseDisabledReason();
  if (disabledReason) {
    return buildDegradedResponse(checkedAt, targets, disabledReason);
  }

  const { sessionUrl, notes, reason } = await checkOfficialSourcesWithBrowserbase(targets);
  const hasChecked = notes.some((note) => note.status === "checked");
  const hasFailed = notes.some((note) => note.status === "failed" || note.status === "fallback");

  if (reason && !hasChecked) {
    return buildDegradedResponse(checkedAt, targets, reason, notes, sessionUrl);
  }

  if (hasFailed) {
    return {
      browserbasePowered: hasChecked,
      degraded: true,
      reason: reason ?? "page_fetch_failed",
      checkedAt,
      sessionUrl,
      notes,
    };
  }

  return {
    browserbasePowered: true,
    degraded: false,
    checkedAt,
    sessionUrl,
    notes,
  };
}
