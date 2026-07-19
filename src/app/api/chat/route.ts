import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { processVolunteerMessage } from "@/lib/orchestrator";
import type { MessageAttachment } from "@/lib/types";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user_role !== "Volunteer") {
    return NextResponse.json(
      { error: "Use task assignment endpoint for Operations Lead commands." },
      { status: 400 }
    );
  }
  if (session.status !== "approved") {
    return NextResponse.json(
      {
        error:
          "Registration submitted. Waiting for your Stadium Operations Lead to approve access.",
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const text = String(body.text || "").trim();
  const rawAtt = Array.isArray(body.attachments) ? body.attachments : [];
  const attachments: MessageAttachment[] = rawAtt
    .map((a: Record<string, unknown>) => ({
      id: String(a.id || ""),
      url: String(a.url || ""),
      name: String(a.name || "photo"),
      mime: String(a.mime || "image/jpeg"),
      size: Number(a.size || 0),
    }))
    .filter((a: MessageAttachment) => a.url.startsWith("/uploads/"));

  if (!text && attachments.length === 0) {
    return NextResponse.json(
      { error: "Empty message. Add text and/or a photo." },
      { status: 400 }
    );
  }

  const result = await processVolunteerMessage(
    session,
    text,
    attachments.length ? attachments : undefined
  );
  return NextResponse.json(result);
}
