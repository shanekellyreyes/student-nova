import "server-only";

import { createHash } from "crypto";
import type { IntakeFormData, MatchResults } from "@/types/opportunity";
import {
  MATCHES_CACHE_PREFIX,
  MATCHES_CACHE_TTL_SECONDS,
  getRedisClient,
} from "@/lib/redis";

export type MatchCacheMetadata = {
  createdAt: string;
  profileHash: string;
  totalCount: number;
  laneCounts: {
    financial: number;
    educational: number;
    professional: number;
  };
  topOpportunityIds: string[];
};

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function devLog(message: string, meta?: Record<string, string | boolean>) {
  if (!isDev()) return;
  if (meta) {
    console.log(`[redis] ${message}`, meta);
  } else {
    console.log(`[redis] ${message}`);
  }
}

export function stableIntakeHash(intake: IntakeFormData): string {
  const normalized = {
    city: intake.city,
    ageRange: intake.ageRange,
    firstGen: intake.firstGen,
    identities: [...intake.identities].sort(),
    interests: [...intake.interests].sort(),
    supportNeeded: [...intake.supportNeeded].sort(),
  };

  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex").slice(0, 24);
}

export function matchCacheKey(intake: IntakeFormData): string {
  return `${MATCHES_CACHE_PREFIX}${stableIntakeHash(intake)}`;
}

export function buildMatchCacheMetadata(
  intake: IntakeFormData,
  results: MatchResults,
): MatchCacheMetadata {
  const laneCounts = {
    financial: 0,
    educational: 0,
    professional: 0,
  };

  const topOpportunityIds: string[] = [];

  for (const lane of results.lanes) {
    laneCounts[lane.lane] = lane.opportunities.length;
    for (const opportunity of lane.opportunities) {
      topOpportunityIds.push(opportunity.id);
    }
  }

  return {
    createdAt: new Date().toISOString(),
    profileHash: stableIntakeHash(intake),
    totalCount: results.totalCount,
    laneCounts,
    topOpportunityIds,
  };
}

export async function readMatchCacheMetadata(
  key: string,
): Promise<{ status: "hit" } | { status: "miss" }> {
  devLog("cache key", { key });

  const redis = await getRedisClient();
  if (!redis) {
    devLog("cache miss");
    return { status: "miss" };
  }

  try {
    const cached = await redis.get(key);
    if (!cached) {
      devLog("cache miss");
      return { status: "miss" };
    }

    JSON.parse(cached) as MatchCacheMetadata;
    devLog("cache hit");
    return { status: "hit" };
  } catch {
    devLog("cache miss");
    return { status: "miss" };
  }
}

export async function writeMatchCacheMetadata(
  key: string,
  metadata: MatchCacheMetadata,
): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) {
    devLog("cache write failure");
    return false;
  }

  try {
    await redis.set(key, JSON.stringify(metadata), { EX: MATCHES_CACHE_TTL_SECONDS });
    devLog("cache write success");
    return true;
  } catch {
    devLog("cache write failure");
    return false;
  }
}
