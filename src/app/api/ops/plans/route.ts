import { NextResponse } from "next/server";
import { getDb, getUserById, updateDb } from "@/lib/db";
import { newId } from "@/lib/id";
import { processLeadTaskAssignment } from "@/lib/orchestrator";
import { getSession } from "@/lib/session";
import type { OpsPlan, OpsPlanPriority, OpsPlanStatus } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  let plans = (db.ops_plans || []).filter(
    (p) => p.stadium_id === session.stadium_id
  );

  if (session.user_role === "Volunteer") {
    plans = plans.filter(
      (p) =>
        p.assigned_volunteer_ids.includes(session.user_id) &&
        p.status !== "cancelled"
    );
  }

  plans.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user_role !== "Operations_Lead") {
    return NextResponse.json({ error: "Operations Lead only." }, { status: 403 });
  }

  const body = await req.json();
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  let location_tag = String(body.location_tag || "").trim();
  const location_detail = body.location_detail
    ? String(body.location_detail).trim()
    : undefined;
  const priority = (body.priority || "medium") as OpsPlanPriority;
  const time_window = body.time_window
    ? String(body.time_window).trim()
    : undefined;
  const volunteerIds: string[] = Array.isArray(body.volunteer_ids)
    ? body.volunteer_ids.map(String)
    : body.volunteer_id
      ? [String(body.volunteer_id)]
      : [];
  const push_tasks = body.push_tasks !== false;

  if (!title || !location_tag) {
    return NextResponse.json(
      { error: "title and location_tag (place of assistance) are required." },
      { status: 400 }
    );
  }

  if (location_tag === "Custom") {
    if (!location_detail) {
      return NextResponse.json(
        { error: "location_detail required for custom place." },
        { status: 400 }
      );
    }
    location_tag = location_detail;
  }

  // Validate volunteers same stadium
  for (const vid of volunteerIds) {
    const u = await getUserById(vid);
    if (
      !u ||
      u.stadium_id !== session.stadium_id ||
      u.role !== "Volunteer" ||
      u.status !== "approved"
    ) {
      return NextResponse.json(
        { error: `Invalid volunteer assignment: ${vid}` },
        { status: 400 }
      );
    }
  }

  const now = new Date().toISOString();
  const status: OpsPlanStatus =
    volunteerIds.length > 0 ? "assigned" : "planned";

  const plan: OpsPlan = {
    id: newId("plan"),
    stadium_id: session.stadium_id,
    title,
    description,
    location_tag,
    location_detail,
    priority: ["low", "medium", "high", "critical"].includes(priority)
      ? priority
      : "medium",
    status,
    assigned_volunteer_ids: volunteerIds,
    created_by: session.user_id,
    created_by_name: session.name,
    created_at: now,
    updated_at: now,
    time_window,
  };

  await updateDb((db) => {
    if (!db.ops_plans) db.ops_plans = [];
    db.ops_plans.push(plan);
  });

  const taskCards = [];
  if (push_tasks && volunteerIds.length > 0) {
    const command =
      description ||
      `${title} at ${location_tag}${time_window ? ` (${time_window})` : ""}`;
    for (const vid of volunteerIds) {
      const card = await processLeadTaskAssignment(session, vid, command, {
        location_tag: plan.location_tag,
        location_detail: plan.location_detail,
        priority: plan.priority,
        plan_id: plan.id,
      });
      taskCards.push(card);
    }
  }

  return NextResponse.json({ plan, tasks: taskCards });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.user_role !== "Operations_Lead") {
    return NextResponse.json({ error: "Operations Lead only." }, { status: 403 });
  }

  const body = await req.json();
  const planId = String(body.plan_id || "").trim();
  if (!planId) {
    return NextResponse.json({ error: "plan_id required" }, { status: 400 });
  }

  const db = await getDb();
  const existing = (db.ops_plans || []).find(
    (p) => p.id === planId && p.stadium_id === session.stadium_id
  );
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const patch: Partial<OpsPlan> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.description !== undefined)
    patch.description = String(body.description).trim();
  if (body.location_tag !== undefined) {
    let tag = String(body.location_tag).trim();
    const detail = body.location_detail
      ? String(body.location_detail).trim()
      : undefined;
    if (tag === "Custom" && detail) tag = detail;
    patch.location_tag = tag;
    if (detail) patch.location_detail = detail;
  }
  if (body.priority !== undefined) {
    patch.priority = body.priority as OpsPlanPriority;
  }
  if (body.status !== undefined) {
    patch.status = body.status as OpsPlanStatus;
  }
  if (body.time_window !== undefined) {
    patch.time_window = String(body.time_window).trim();
  }
  if (Array.isArray(body.volunteer_ids)) {
    const ids = body.volunteer_ids.map(String);
    for (const vid of ids) {
      const u = await getUserById(vid);
      if (!u || u.stadium_id !== session.stadium_id) {
        return NextResponse.json(
          { error: "Invalid volunteer in assignment list" },
          { status: 400 }
        );
      }
    }
    patch.assigned_volunteer_ids = ids;
    if (ids.length > 0 && existing.status === "planned") {
      patch.status = "assigned";
    }
  }

  await updateDb((d) => {
    if (!d.ops_plans) d.ops_plans = [];
    const idx = d.ops_plans.findIndex((p) => p.id === planId);
    if (idx === -1) return;
    d.ops_plans[idx] = { ...d.ops_plans[idx], ...patch };
  });

  const dbAfter = await getDb();
  const planOut =
    (dbAfter.ops_plans || []).find((p) => p.id === planId) ?? null;
  if (!planOut) {
    return NextResponse.json({ error: "Plan not found after update" }, { status: 404 });
  }

  // Optionally push new task cards when assigning more volunteers
  const push_tasks = body.push_tasks === true;
  const taskCards = [];
  if (push_tasks && Array.isArray(body.volunteer_ids)) {
    const command =
      planOut.description ||
      `${planOut.title} at ${planOut.location_tag}`;
    for (const vid of body.volunteer_ids.map(String)) {
      const card = await processLeadTaskAssignment(session, vid, command, {
        location_tag: planOut.location_tag,
        location_detail: planOut.location_detail,
        priority: planOut.priority,
        plan_id: planOut.id,
      });
      taskCards.push(card);
    }
  }

  return NextResponse.json({ plan: planOut, tasks: taskCards });
}
