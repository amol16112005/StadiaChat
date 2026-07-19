import { NextResponse } from "next/server";
import type { AuthSession } from "./types";
import { getSession } from "./session";
export { safeSecretEqual, str } from "./safe-equal";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseJsonBody(
  req: Request
): Promise<
  { ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }
> {
  try {
    const body = (await req.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return {
        ok: false,
        response: jsonError("Invalid JSON body.", 400),
      };
    }
    return { ok: true, body: body as Record<string, unknown> };
  } catch {
    return { ok: false, response: jsonError("Invalid JSON body.", 400) };
  }
}

export async function requireAuth(
  role?: "Volunteer" | "Operations_Lead"
): Promise<
  { ok: true; session: AuthSession } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }
  if (role && session.user_role !== role) {
    return {
      ok: false,
      response: jsonError(
        role === "Operations_Lead"
          ? "Operations Lead only."
          : "Volunteer only.",
        403
      ),
    };
  }
  return { ok: true, session };
}
