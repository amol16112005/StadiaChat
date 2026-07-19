import { NextResponse } from "next/server";
import {
  getDb,
  getStadiumIncidents,
  getStadiumUsers,
} from "@/lib/db";
import { getSession } from "@/lib/session";
import { processExpiredSeriousTimers } from "@/lib/orchestrator";

import {
  DEFAULT_MESSAGE_LIMIT,
  MAX_MESSAGE_LIMIT,
} from "@/lib/ops-constants";

const DEFAULT_MSG_LIMIT = DEFAULT_MESSAGE_LIMIT;
const MAX_MSG_LIMIT = MAX_MESSAGE_LIMIT;

function capMessages<T>(rows: T[], limit: number): T[] {
  if (rows.length <= limit) return rows;
  return rows.slice(rows.length - limit);
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tick safety override timer on every poll
  await processExpiredSeriousTimers(session.stadium_id);

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit") || DEFAULT_MSG_LIMIT);
  const limit = Math.min(
    MAX_MSG_LIMIT,
    Math.max(20, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_MSG_LIMIT)
  );
  const since = url.searchParams.get("since")?.trim() || "";

  const db = await getDb();
  const stadiumId = session.stadium_id;

  const allPlans = (db.ops_plans || []).filter(
    (p) => p.stadium_id === stadiumId
  );

  const afterSince = <T extends { created_at: string }>(rows: T[]) => {
    if (!since) return rows;
    const t = new Date(since).getTime();
    if (!Number.isFinite(t)) return rows;
    return rows.filter((m) => new Date(m.created_at).getTime() > t);
  };

  if (session.user_role === "Operations_Lead") {
    const messages = capMessages(
      afterSince(
        db.messages
          .filter((m) => m.stadium_id === stadiumId)
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          )
      ),
      limit
    );
    const users = await getStadiumUsers(stadiumId);
    const incidents = await getStadiumIncidents(stadiumId);
    return NextResponse.json({
      messages,
      users: users.filter((u) => u.role === "Volunteer"),
      incidents,
      plans: allPlans.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
      session,
      meta: { limit, since: since || null },
    });
  }

  // Volunteer: own thread + system + tasks directed at them
  const messages = capMessages(
    afterSince(
      db.messages
        .filter(
          (m) =>
            m.stadium_id === stadiumId &&
            (m.sender_id === session.user_id ||
              m.recipient_id === session.user_id ||
              (m.sender_role === "System" &&
                m.recipient_id === session.user_id))
        )
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
    ),
    limit
  );

  const incidents = (await getStadiumIncidents(stadiumId)).filter(
    (i) => i.reporter_id === session.user_id
  );

  const plans = allPlans.filter(
    (p) =>
      p.assigned_volunteer_ids.includes(session.user_id) &&
      p.status !== "cancelled" &&
      p.status !== "completed"
  );

  return NextResponse.json({
    messages,
    incidents,
    plans,
    session,
    meta: { limit, since: since || null },
  });
}
