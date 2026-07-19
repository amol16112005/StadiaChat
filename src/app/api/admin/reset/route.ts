import { NextResponse } from "next/server";
import { resetDb } from "@/lib/db";

export async function POST() {
  const db = await resetDb();
  return NextResponse.json({
    ok: true,
    stadiums: db.stadiums.length,
    users: db.users.length,
    protocols: db.protocols.length,
  });
}
