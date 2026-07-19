import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { processFanAssist } from "@/lib/fan-assist";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user_role !== "Volunteer") {
    return NextResponse.json(
      { error: "Fan Assist is available on Volunteer devices." },
      { status: 403 }
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
  const transcript = String(body.transcript || "").trim();
  const preferred_language = body.preferred_language
    ? String(body.preferred_language)
    : "auto";

  if (!transcript) {
    return NextResponse.json({ error: "Empty transcript." }, { status: 400 });
  }

  try {
    const result = await processFanAssist(session, transcript, {
      preferred_language,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fan Assist failed" },
      { status: 500 }
    );
  }
}
