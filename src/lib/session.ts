import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { AuthSession } from "./types";
import { getUserById } from "./db";

const COOKIE = "stadia_session";

function sessionSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.ADMIN_RESET_TOKEN?.trim() ||
    // Dev fallback only — set SESSION_SECRET in production
    "stadiachat-dev-only-change-me"
  );
}

function sign(payloadB64: string): string {
  return createHmac("sha256", sessionSecret())
    .update(payloadB64)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Cookie value: base64url(JSON).hmac */
function encodeCookie(userId: string): string {
  const payloadB64 = Buffer.from(
    JSON.stringify({ uid: userId, v: 1 }),
    "utf-8"
  ).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

function decodeCookie(raw: string): { userId: string } | null {
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig || !safeEqual(sig, sign(payloadB64))) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    ) as { uid?: string };
    if (!parsed.uid || typeof parsed.uid !== "string") return null;
    return { userId: parsed.uid };
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: AuthSession): Promise<void> {
  const store = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  store.set(COOKIE, encodeCookie(session.user_id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: isProd,
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

  // Support one deploy window: try signed format, then legacy unsigned base64
  let userId: string | null = null;
  const signed = decodeCookie(raw);
  if (signed) {
    userId = signed.userId;
  } else {
    try {
      const legacy = JSON.parse(
        Buffer.from(raw, "base64url").toString("utf-8")
      ) as { user_id?: string };
      if (legacy.user_id) userId = legacy.user_id;
    } catch {
      return null;
    }
  }
  if (!userId) return null;

  try {
    const user = await getUserById(userId);
    if (!user) return null;
    // Role/status always from DB — never trust client cookie fields
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
