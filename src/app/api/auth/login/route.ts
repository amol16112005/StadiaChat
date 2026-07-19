import { NextResponse } from "next/server";
import { getDb, updateUser } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";
import type { AuthSession } from "@/lib/types";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`auth-login:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Wait and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const mode = String(body.mode || "volunteer");
  const language = body.language
    ? String(body.language).trim().toLowerCase()
    : undefined;

  // Operations Lead: corporate master credential + stadium_id + optional language
  if (mode === "ops") {
    const stadium_id = String(body.stadium_id || "").trim();
    const credential = String(body.credential || "").trim();
    if (!stadium_id || !credential) {
      return NextResponse.json(
        { error: "Stadium ID and master credential required." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const stadium = db.stadiums.find((s) => s.id === stadium_id);
    if (!stadium || stadium.ops_credential !== credential) {
      return NextResponse.json(
        { error: "Invalid Operations Lead credentials." },
        { status: 401 }
      );
    }

    let lead = db.users.find(
      (u) =>
        u.stadium_id === stadium_id &&
        u.role === "Operations_Lead" &&
        u.status === "approved"
    );
    if (!lead) {
      return NextResponse.json(
        { error: "Operations Lead account not provisioned." },
        { status: 404 }
      );
    }

    if (language && language !== lead.preferred_language) {
      lead = (await updateUser(lead.id, { preferred_language: language })) || lead;
    }

    const session: AuthSession = {
      user_id: lead.id,
      stadium_id: lead.stadium_id,
      user_role: lead.role,
      name: lead.name,
      preferred_language: lead.preferred_language,
      status: lead.status,
    };
    await setSessionCookie(session);
    return NextResponse.json({
      user: lead,
      panel: "master_terminal",
      stadium: { id: stadium.id, name: stadium.name },
    });
  }

  // Volunteer login: name + stadium_id + stadium_pin (required after approval)
  const name = String(body.name || "").trim();
  const stadium_id = String(body.stadium_id || "").trim();
  const stadium_pin = String(body.stadium_pin || "").trim();

  if (!name || !stadium_id || !stadium_pin) {
    return NextResponse.json(
      {
        error:
          "Name, Stadium ID, and stadium PIN are required to log in. (PIN is not used during registration.)",
      },
      { status: 400 }
    );
  }

  const db = await getDb();
  const stadium = db.stadiums.find((s) => s.id === stadium_id);
  if (!stadium || stadium.pin !== stadium_pin) {
    return NextResponse.json(
      { error: "Invalid Stadium ID or PIN." },
      { status: 401 }
    );
  }

  let user = db.users.find(
    (u) =>
      u.stadium_id === stadium_id &&
      u.role === "Volunteer" &&
      u.name.toLowerCase() === name.toLowerCase()
  );

  if (!user) {
    return NextResponse.json(
      {
        error:
          "No volunteer with that name at this stadium. Use the exact name from Register (e.g. ram). If the database was reset, register again.",
      },
      { status: 404 }
    );
  }

  if (user.status === "rejected") {
    return NextResponse.json(
      { error: "Access was rejected by your Operations Lead." },
      { status: 403 }
    );
  }

  if (language && language !== user.preferred_language) {
    user = (await updateUser(user.id, { preferred_language: language })) || user;
  }

  const session: AuthSession = {
    user_id: user.id,
    stadium_id: user.stadium_id,
    user_role: user.role,
    name: user.name,
    preferred_language: user.preferred_language,
    status: user.status,
  };
  await setSessionCookie(session);

  return NextResponse.json({
    user,
    notice:
      user.status === "pending"
        ? "Logged in, but still pending Ops Lead approval. Chat is limited until approved."
        : undefined,
  });
}
