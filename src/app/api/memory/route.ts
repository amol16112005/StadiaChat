import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getRecentMemory } from "@/lib/memory";
import { isMongoEnabled } from "@/lib/mongo";

/** Recent long-term memory events for the active stadium (Ops Lead sees all; volunteer sees own). */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMongoEnabled()) {
    return NextResponse.json({
      enabled: false,
      events: [],
      note: "MongoDB memory layer off. Set MONGODB_URI to enable.",
    });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 30), 100);

  const events = await getRecentMemory({
    stadium_id: session.stadium_id,
    user_id:
      session.user_role === "Operations_Lead" ? undefined : session.user_id,
    limit,
  });

  return NextResponse.json({
    enabled: true,
    stadium_id: session.stadium_id,
    count: events.length,
    events,
  });
}
