import { createHmac, timingSafeEqual } from "crypto";

export function resolveSessionSecret(
  env: NodeJS.ProcessEnv = process.env
): string {
  return (
    env.SESSION_SECRET?.trim() ||
    env.ADMIN_RESET_TOKEN?.trim() ||
    "stadiachat-dev-only-change-me"
  );
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
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
export function encodeSessionCookie(
  userId: string,
  secret: string = resolveSessionSecret()
): string {
  const payloadB64 = Buffer.from(
    JSON.stringify({ uid: userId, v: 1 }),
    "utf-8"
  ).toString("base64url");
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

export function decodeSessionCookie(
  raw: string,
  secret: string = resolveSessionSecret()
): { userId: string } | null {
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig || !safeEqual(sig, sign(payloadB64, secret))) {
    return null;
  }
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
