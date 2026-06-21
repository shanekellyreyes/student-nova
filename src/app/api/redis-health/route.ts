import { getRedisConfigSnapshot, getRedisHealth } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const snapshot = getRedisConfigSnapshot();
  const health = await getRedisHealth();

  return Response.json({
    configured: snapshot.configured,
    health,
    hasHost: snapshot.hasHost,
    hasPassword: snapshot.hasPassword,
    hasPort: snapshot.hasPort,
    hasUser: snapshot.hasUser,
    port: snapshot.port,
  });
}
