import { cookies } from "next/headers";
import type { AuthSession } from "./types";
import { getUserById } from "./db";

const COOKIE = "stadia_session";

export async function setSessionCookie(session: AuthSession): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, Buffer.from(JSON.stringify(session)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession(): Promise<AuthSession | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf-8")
    ) as AuthSession;
    const user = await getUserById(parsed.user_id);
    if (!user) return null;
    // Refresh mutable fields
    return {
      user_id: user.id,
      stadium_id: user.stadium_id,
      user_role: user.role,
      name: user.name,
      preferred_language: user.preferred_language,
      status: user.status,
    };
  } catch {
    return null;
  }
}

export async function requireSession(
  role?: "Volunteer" | "Operations_Lead"
): Promise<AuthSession> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (role && session.user_role !== role) throw new Error("Forbidden role");
  return session;
}
