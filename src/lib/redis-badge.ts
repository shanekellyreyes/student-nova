import type { RedisStatus } from "@/types/opportunity";

export function getRedisBadgeLabel(redis: RedisStatus | null | undefined): string | null {
  if (!redis || redis.degraded) return null;
  if (redis.cacheHit) return "Redis cache hit";
  return "Redis cache ready";
}
