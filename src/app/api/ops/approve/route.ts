import { NextResponse } from "next/server";
import { getUserById, updateUser, addMessage } from "@/lib/db";
import { newId } from "@/lib/id";
import { translateText } from "@/lib/xai";
import { parseJsonBody, requireAuth, str } from "@/lib/http";

export async function POST(req: Request) {
  const auth = await requireAuth("Operations_Lead");
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const userId = str(parsed.body, "user_id");
  const action = (str(parsed.body, "action") || "approve") as
    | "approve"
    | "reject";

  const user = await getUserById(userId);
  if (!user || user.stadium_id !== session.stadium_id) {
    return NextResponse.json(
      { error: "User not found in this stadium tenancy." },
      { status: 404 }
    );
  }
  if (user.role !== "Volunteer") {
    return NextResponse.json(
      { error: "Only volunteers can be approved." },
      { status: 400 }
    );
  }

  const status = action === "reject" ? "rejected" : "approved";
  const updated = await updateUser(userId, { status });

  const notice =
    status === "approved"
      ? "Access approved by Stadium Operations Lead. You may use operational chat."
      : "Access rejected by Stadium Operations Lead. Contact your venue supervisor.";

  const text = await translateText(notice, user.preferred_language, "en");
  await addMessage({
    id: newId("msg"),
    stadium_id: session.stadium_id,
    sender_id: session.user_id,
    sender_name: session.name,
    sender_role: "Operations_Lead",
    recipient_id: userId,
    text,
    language: user.preferred_language,
    ui_component: "text",
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ user: updated });
}
