import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/** Public list of stadium IDs for registration (no pins exposed fully — pin must be known). */
export async function GET() {
  const db = await getDb();
  return NextResponse.json({
    stadiums: db.stadiums.map((s) => ({
      id: s.id,
      name: s.name,
      city: s.city,
    })),
  });
}
