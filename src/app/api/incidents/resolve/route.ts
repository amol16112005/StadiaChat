import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { resolveIncidentByLead } from "@/lib/orchestrator";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user_role !== "Operations_Lead") {
    return NextResponse.json({ error: "Operations Lead only." }, { status: 403 });
  }

  const body = await req.json();
  const incidentId = String(body.incident_id || "").trim();
  const option = body.option ? String(body.option) : undefined;
  const custom_instruction = body.custom_instruction
    ? String(body.custom_instruction)
    : undefined;

  if (!incidentId) {
    return NextResponse.json({ error: "incident_id required" }, { status: 400 });
  }

  try {
    const result = await resolveIncidentByLead(
      session,
      incidentId,
      option,
      custom_instruction
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Resolve failed" },
      { status: 400 }
    );
  }
}
