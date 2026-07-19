import { NextResponse } from "next/server";
import { processLeadTaskAssignment } from "@/lib/orchestrator";
import { getDb, updateDb } from "@/lib/db";
import { parseJsonBody, requireAuth, str } from "@/lib/http";

export async function POST(req: Request) {
  const auth = await requireAuth("Operations_Lead");
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const volunteerId = str(body, "volunteer_id");
  const command = str(body, "command");
  const location_tag = body.location_tag
    ? String(body.location_tag).trim()
    : undefined;
  const location_detail = body.location_detail
    ? String(body.location_detail).trim()
    : undefined;
  const priority = body.priority as
    | "low"
    | "medium"
    | "high"
    | "critical"
    | undefined;
  const plan_id = body.plan_id ? String(body.plan_id).trim() : undefined;

  if (!volunteerId || !command) {
    return NextResponse.json(
      { error: "volunteer_id and command required." },
      { status: 400 }
    );
  }
  if (!location_tag && !location_detail) {
    return NextResponse.json(
      {
        error:
          "Place of assistance required: set location_tag (or location_detail).",
      },
      { status: 400 }
    );
  }

  try {
    const card = await processLeadTaskAssignment(session, volunteerId, command, {
      location_tag,
      location_detail,
      priority,
      plan_id,
    });
    return NextResponse.json({
      ui_component: "actionable_task_card",
      task_title: card.task_title,
      location_tag: card.location_tag,
      location_detail: card.location_detail,
      priority: card.priority,
      accept_action: true,
      message: card,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Task failed" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const messageId = str(parsed.body, "message_id");
  if (!messageId) {
    return NextResponse.json({ error: "message_id required" }, { status: 400 });
  }

  const db = await getDb();
  const msg = db.messages.find((m) => m.id === messageId);
  if (!msg || msg.stadium_id !== session.stadium_id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (msg.recipient_id !== session.user_id) {
    return NextResponse.json({ error: "Not your task" }, { status: 403 });
  }

  await updateDb((d) => {
    const m = d.messages.find((x) => x.id === messageId);
    if (m) m.accepted = true;
  });

  return NextResponse.json({ ok: true });
}
