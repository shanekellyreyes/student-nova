import { getOpportunitySignals } from "@/lib/redis-signals";

export const runtime = "nodejs";

export async function GET() {
  const signals = await getOpportunitySignals();
  return Response.json(signals);
}
