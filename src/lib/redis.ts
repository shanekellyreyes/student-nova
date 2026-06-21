import "server-only";

import { createClient, type RedisClientType } from "redis";

export const MATCHES_CACHE_PREFIX = "student-nova:matches:";
export const MATCHES_CACHE_TTL_SECONDS = 15 * 60;

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function devLog(message: string, meta?: Record<string, string | number | boolean>) {
  if (!isDev()) return;
  if (meta) {
    console.log(`[redis] ${message}`, meta);
  } else {
    console.log(`[redis] ${message}`);
  }
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_HOST?.trim());
}

export function getRedisConfigSnapshot() {
  return {
    configured: isRedisConfigured(),
    hasHost: Boolean(process.env.REDIS_HOST?.trim()),
    hasPort: Boolean(process.env.REDIS_PORT?.trim()),
    hasUser: Boolean(process.env.REDIS_USER?.trim()),
    hasPassword: Boolean(process.env.REDIS_PASSWORD?.trim()),
    port: Number.parseInt(process.env.REDIS_PORT ?? "6379", 10),
  };
}

function buildRedisClient(): RedisClientType {
  return createClient({
    username: process.env.REDIS_USER || "default",
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      connectTimeout: 5000,
      reconnectStrategy: () => false,
    },
  });
}

function resetClientState() {
  client = null;
  connectPromise = null;
}

async function connectRedisInternal(): Promise<RedisClientType | null> {
  try {
    const nextClient = buildRedisClient();
    nextClient.on("error", (error) => {
      devLog("client error", { message: error.message });
    });

    await nextClient.connect();
    client = nextClient;
    devLog("connect success");
    return nextClient;
  } catch (error) {
    resetClientState();
    devLog("connect failure", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!isRedisConfigured()) return null;

  if (client?.isOpen) return client;

  if (client && !client.isOpen) {
    resetClientState();
  }

  if (!connectPromise) {
    connectPromise = connectRedisInternal();
  }

  const connected = await connectPromise;
  if (!connected) {
    connectPromise = null;
  }

  return connected;
}

export async function pingRedis(): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) return false;
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

export async function getRedisHealth(): Promise<"available" | "unavailable" | "not_configured"> {
  if (!isRedisConfigured()) return "not_configured";
  const ok = await pingRedis();
  return ok ? "available" : "unavailable";
}
