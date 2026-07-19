import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getStadium } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const stadium = await getStadium(session.stadium_id);
  return NextResponse.json({
    user: session,
    stadium: stadium
      ? { id: stadium.id, name: stadium.name, city: stadium.city }
      : null,
  });
}
