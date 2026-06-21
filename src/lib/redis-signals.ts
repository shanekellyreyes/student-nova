import "server-only";

import {
  AGE_RANGES,
  CITIES,
  FIRST_GEN_OPTIONS,
  IDENTITY_OPTIONS,
  INTEREST_OPTIONS,
  SUPPORT_OPTIONS,
  opportunities,
} from "@/data/opportunities";
import { getRedisClient, isRedisConfigured } from "@/lib/redis";
import type { IntakeFormData, MatchResults } from "@/types/opportunity";
import type { SignalCount, SignalsApiResponse, TrendingOpportunity } from "@/types/signals";

export const SIGNAL_KEYS = {
  cities: "student-nova:signals:cities",
  ageRanges: "student-nova:signals:ageRanges",
  communities: "student-nova:signals:communities",
  interests: "student-nova:signals:interests",
  supportTypes: "student-nova:signals:supportTypes",
  firstGen: "student-nova:signals:firstGen",
  topOpportunities: "student-nova:signals:topOpportunities",
} as const;

const ALLOWED_CITIES = new Set<string>(CITIES);
const ALLOWED_AGE_RANGES = new Set<string>(AGE_RANGES);
const ALLOWED_FIRST_GEN = new Set<string>(FIRST_GEN_OPTIONS);
const ALLOWED_IDENTITIES = new Set<string>(IDENTITY_OPTIONS);
const ALLOWED_INTERESTS = new Set<string>(INTEREST_OPTIONS);
const ALLOWED_SUPPORT = new Set<string>(SUPPORT_OPTIONS);
const KNOWN_OPPORTUNITY_IDS = new Set(opportunities.map((opportunity) => opportunity.id));
const OPPORTUNITY_TITLES = new Map(
  opportunities.map((opportunity) => [opportunity.id, opportunity.title]),
);

const TOP_N = 5;

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function devLog(message: string, meta?: Record<string, string | number>) {
  if (!isDev()) return;
  if (meta) {
    console.log(`[redis-signals] ${message}`, meta);
  } else {
    console.log(`[redis-signals] ${message}`);
  }
}

function emptySignalsResponse(degraded: boolean): SignalsApiResponse {
  return {
    redisPowered: !degraded && isRedisConfigured(),
    degraded,
    topCities: [],
    topInterests: [],
    topSupportTypes: [],
    topOpportunities: [],
  };
}

function firstGenCategory(value: string): "yes" | "no" | "skipped" | null {
  if (value === "yes" || value === "no") return value;
  if (value === "prefer not to say" || value === "") return "skipped";
  if (ALLOWED_FIRST_GEN.has(value)) return "skipped";
  return null;
}

function hashToTopCounts(raw: Record<string, string>, limit: number): SignalCount[] {
  return Object.entries(raw)
    .map(([label, count]) => ({ label, count: Number.parseInt(count, 10) || 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function zsetToTopCounts(
  raw: { value: string; score: number }[],
  limit: number,
): SignalCount[] {
  return raw
    .map((entry) => ({ label: entry.value, count: entry.score }))
    .filter((entry) => entry.count > 0)
    .slice(0, limit);
}

function collectReturnedOpportunityIds(results: MatchResults): string[] {
  const ids: string[] = [];
  for (const lane of results.lanes) {
    for (const opportunity of lane.opportunities) {
      if (KNOWN_OPPORTUNITY_IDS.has(opportunity.id)) {
        ids.push(opportunity.id);
      }
    }
  }
  return ids;
}

export async function recordMatchSignals(
  intake: IntakeFormData,
  results: MatchResults,
): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    const multi = redis.multi();

    if (ALLOWED_CITIES.has(intake.city)) {
      multi.hIncrBy(SIGNAL_KEYS.cities, intake.city, 1);
    }

    if (ALLOWED_AGE_RANGES.has(intake.ageRange)) {
      multi.hIncrBy(SIGNAL_KEYS.ageRanges, intake.ageRange, 1);
    }

    const firstGen = firstGenCategory(intake.firstGen);
    if (firstGen) {
      multi.hIncrBy(SIGNAL_KEYS.firstGen, firstGen, 1);
    }

    for (const identity of intake.identities) {
      if (identity === "Prefer not to say") continue;
      if (ALLOWED_IDENTITIES.has(identity)) {
        multi.hIncrBy(SIGNAL_KEYS.communities, identity, 1);
      }
    }

    for (const interest of intake.interests) {
      if (ALLOWED_INTERESTS.has(interest)) {
        multi.zIncrBy(SIGNAL_KEYS.interests, 1, interest);
      }
    }

    for (const support of intake.supportNeeded) {
      if (ALLOWED_SUPPORT.has(support)) {
        multi.zIncrBy(SIGNAL_KEYS.supportTypes, 1, support);
      }
    }

    for (const opportunityId of collectReturnedOpportunityIds(results)) {
      multi.zIncrBy(SIGNAL_KEYS.topOpportunities, 1, opportunityId);
    }

    await multi.exec();
    devLog("recorded match signals", { opportunityIds: collectReturnedOpportunityIds(results).length });
  } catch (error) {
    devLog("record failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function getOpportunitySignals(): Promise<SignalsApiResponse> {
  if (!isRedisConfigured()) {
    return emptySignalsResponse(true);
  }

  const redis = await getRedisClient();
  if (!redis) {
    return emptySignalsResponse(true);
  }

  try {
    const [citiesRaw, interestsRaw, supportRaw, opportunitiesRaw] = await Promise.all([
      redis.hGetAll(SIGNAL_KEYS.cities),
      redis.zRangeWithScores(SIGNAL_KEYS.interests, 0, TOP_N - 1, { REV: true }),
      redis.zRangeWithScores(SIGNAL_KEYS.supportTypes, 0, TOP_N - 1, { REV: true }),
      redis.zRangeWithScores(SIGNAL_KEYS.topOpportunities, 0, TOP_N - 1, { REV: true }),
    ]);

    const topCities = hashToTopCounts(citiesRaw, TOP_N);
    const topInterests = zsetToTopCounts(interestsRaw, TOP_N);
    const topSupportTypes = zsetToTopCounts(supportRaw, TOP_N);
    const topOpportunities: TrendingOpportunity[] = opportunitiesRaw
      .map((entry) => ({
        id: entry.value,
        title: OPPORTUNITY_TITLES.get(entry.value) ?? entry.value,
        count: entry.score,
      }))
      .filter((entry) => entry.count > 0 && KNOWN_OPPORTUNITY_IDS.has(entry.id))
      .slice(0, TOP_N);

    return {
      redisPowered: true,
      degraded: false,
      topCities,
      topInterests,
      topSupportTypes,
      topOpportunities,
    };
  } catch (error) {
    devLog("read failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return emptySignalsResponse(true);
  }
}
