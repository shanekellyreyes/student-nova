import "server-only";

import { matchOpportunities } from "@/data/matcher";
import {
  buildMatchCacheMetadata,
  matchCacheKey,
  readMatchCacheMetadata,
  writeMatchCacheMetadataBestEffort,
} from "@/lib/match-cache";
import { isRedisConfigured } from "@/lib/redis";
import type {
  IntakeFormData,
  MatchApiResponse,
  MatchResults,
  RedisDegradedReason,
  RedisStatus,
} from "@/types/opportunity";

function emptyRedisStatus(degraded: boolean, reason?: RedisDegradedReason): RedisStatus {
  return {
    cacheHit: false,
    geoRanked: false,
    degraded,
    reason,
  };
}

function buildResponse(results: MatchResults, redis: RedisStatus): MatchApiResponse {
  return { ...results, redis };
}

export async function getMatchesWithRedis(intake: IntakeFormData): Promise<MatchApiResponse> {
  const results = matchOpportunities(intake);

  if (!isRedisConfigured()) {
    return buildResponse(results, emptyRedisStatus(true, "missing_env"));
  }

  const cacheKey = matchCacheKey(intake);
  const cacheRead = await readMatchCacheMetadata(cacheKey);

  if (cacheRead.status === "hit") {
    return buildResponse(results, {
      cacheHit: true,
      geoRanked: false,
      degraded: false,
    });
  }

  const metadata = buildMatchCacheMetadata(intake, results);
  writeMatchCacheMetadataBestEffort(cacheKey, metadata);

  return buildResponse(results, {
    cacheHit: false,
    geoRanked: false,
    degraded: false,
  });
}
