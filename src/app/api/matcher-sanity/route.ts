import { runMatcherSanityChecks } from "@/data/matcher-sanity";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const checks = runMatcherSanityChecks();
  const pass = checks.every((check) => check.pass);

  return Response.json({ pass, checks });
}
