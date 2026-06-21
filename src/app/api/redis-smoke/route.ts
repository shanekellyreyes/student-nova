import { getRedisClient } from "@/lib/redis";

export const runtime = "nodejs";

const SMOKE_KEY = "student-nova:smoke";

export async function GET() {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      return Response.json({ ok: false, reason: "connect_failed" });
    }

    await redis.set(SMOKE_KEY, "ok", { EX: 60 });
    const value = await redis.get(SMOKE_KEY);

    if (value !== "ok") {
      return Response.json({ ok: false, reason: "value_mismatch" });
    }

    return Response.json({ ok: true, value: "ok" });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown_error";
    return Response.json({ ok: false, reason });
  }
}
