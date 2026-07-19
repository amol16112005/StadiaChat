import { NextResponse } from "next/server";
import { getSession, setSessionCookie } from "@/lib/session";
import { getStadium, getUserById, updateUser } from "@/lib/db";
import type { AuthSession } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserById(session.user_id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const stadium = await getStadium(user.stadium_id);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      preferred_language: user.preferred_language,
      stadium_id: user.stadium_id,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    },
    stadium: stadium
      ? { id: stadium.id, name: stadium.name, city: stadium.city }
      : null,
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const patch: { name?: string; preferred_language?: string } = {};

  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    }
    patch.name = name;
  }

  if (body.preferred_language !== undefined) {
    const lang = String(body.preferred_language || "").trim().toLowerCase();
    if (!lang) {
      return NextResponse.json(
        { error: "Language cannot be empty." },
        { status: 400 }
      );
    }
    patch.preferred_language = lang;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  }

  const updated = await updateUser(session.user_id, patch);
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const nextSession: AuthSession = {
    user_id: updated.id,
    stadium_id: updated.stadium_id,
    user_role: updated.role,
    name: updated.name,
    preferred_language: updated.preferred_language,
    status: updated.status,
  };
  await setSessionCookie(nextSession);

  const stadium = await getStadium(updated.stadium_id);

  return NextResponse.json({
    user: {
      id: updated.id,
      name: updated.name,
      preferred_language: updated.preferred_language,
      stadium_id: updated.stadium_id,
      role: updated.role,
      status: updated.status,
      created_at: updated.created_at,
    },
    stadium: stadium
      ? { id: stadium.id, name: stadium.name, city: stadium.city }
      : null,
  });
}
