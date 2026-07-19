import { NextResponse } from "next/server";
import {
  getDb,
  getStadiumIncidents,
  getStadiumUsers,
} from "@/lib/db";
import { getSession } from "@/lib/session";
import { processExpiredSeriousTimers } from "@/lib/orchestrator";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tick safety override timer on every poll
  await processExpiredSeriousTimers(session.stadium_id);

  const db = await getDb();
  const stadiumId = session.stadium_id;

  const allPlans = (db.ops_plans || []).filter(
    (p) => p.stadium_id === stadiumId
  );

  if (session.user_role === "Operations_Lead") {
    const messages = db.messages
      .filter((m) => m.stadium_id === stadiumId)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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
    });
  }

  // Volunteer: own thread + system + tasks directed at them
  const messages = db.messages
    .filter(
      (m) =>
        m.stadium_id === stadiumId &&
        (m.sender_id === session.user_id ||
          m.recipient_id === session.user_id ||
          (m.sender_role === "System" && m.recipient_id === session.user_id))
    )
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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

  return NextResponse.json({ messages, incidents, plans, session });
}
