import { NextResponse } from "next/server";
import { getDb, updateDb } from "@/lib/db";
import { newId } from "@/lib/id";
import { setSessionCookie } from "@/lib/session";
import type { AuthSession } from "@/lib/types";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Registration does NOT require stadium PIN.
 * Volunteer picks stadium + name + language → status pending.
 * After Ops Lead approves, login requires stadium PIN.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`auth-register:${ip}`, { limit: 15, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many registrations from this network. Try later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const name = String(body.name || "").trim().slice(0, 80);
  const language = String(body.language || "en").trim().slice(0, 12) || "en";
  const stadium_id = String(body.stadium_id || "").trim().slice(0, 64);

  if (!name || !stadium_id) {
    return NextResponse.json(
      { error: "Name and Stadium ID are required. PIN is only needed at login after approval." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const stadium = db.stadiums.find((s) => s.id === stadium_id);
  if (!stadium) {
    return NextResponse.json(
      { error: "Unknown Stadium ID. Choose a venue from the list." },
      { status: 404 }
    );
  }

  const existing = db.users.find(
    (u) =>
      u.stadium_id === stadium_id &&
      u.role === "Volunteer" &&
      u.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    return NextResponse.json(
      {
        error:
          "A volunteer with this name is already registered at this stadium. Use Login with the stadium PIN after approval.",
      },
      { status: 409 }
    );
  }

  const user = {
    id: newId("vol"),
    name,
    preferred_language: language,
    stadium_id,
    role: "Volunteer" as const,
    status: "pending" as const,
    created_at: new Date().toISOString(),
  };

  await updateDb((d) => {
    d.users.push(user);
  });

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
    message:
      "Registration submitted. Waiting for your Stadium Operations Lead to approve access. After approval, log in with your name, stadium, and stadium PIN.",
    status: "pending",
    note: "Stadium PIN is not required to register. You will need the stadium PIN only when logging in after approval.",
  });
}
