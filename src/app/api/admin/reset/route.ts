import { NextResponse } from "next/server";
import { resetDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Reseed operational DB.
 * Authorization (any one of):
 * 1. Header `x-admin-reset-token` matches ADMIN_RESET_TOKEN env
 * 2. Logged-in Operations_Lead (demo convenience)
 * 3. Non-production AND no ADMIN_RESET_TOKEN set (local only)
 */
function authorized(req: Request, isOpsLead: boolean): boolean {
  const token = process.env.ADMIN_RESET_TOKEN?.trim();
  const header = req.headers.get("x-admin-reset-token")?.trim();
  if (token) {
    return Boolean(header && header === token);
  }
  if (isOpsLead) return true;
  return process.env.NODE_ENV !== "production";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`admin-reset:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many reset attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const session = await getSession();
  const isOpsLead = session?.user_role === "Operations_Lead";

  if (!authorized(req, Boolean(isOpsLead))) {
    return NextResponse.json(
      {
        error:
          "Forbidden. Set ADMIN_RESET_TOKEN and send header x-admin-reset-token, or log in as Operations Lead (local/demo).",
      },
      { status: 403 }
    );
  }

  const db = await resetDb();
  return NextResponse.json({
    ok: true,
    stadiums: db.stadiums.length,
    users: db.users.length,
    protocols: db.protocols.length,
  });
}
