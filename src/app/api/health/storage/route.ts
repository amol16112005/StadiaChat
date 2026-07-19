import { NextResponse } from "next/server";
import { getDbBackendInfo } from "@/lib/db";
import { isMongoEnabled, getMongoDbName } from "@/lib/mongo";

export async function GET() {
  const info = await getDbBackendInfo();
  return NextResponse.json({
    mongodb_configured: isMongoEnabled(),
    mongodb_db: getMongoDbName(),
    active_backend: info.backend,
    mongo_ready: info.mongoReady,
    error: info.error || null,
    memory_layer: info.backend === "mongodb",
    note:
      info.backend === "mongodb"
        ? "Operational state + memory_events stored in MongoDB."
        : "Using local file data/db.json. Set MONGODB_URI in .env.local for MongoDB memory layer.",
  });
}
