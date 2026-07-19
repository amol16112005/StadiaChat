import { NextResponse } from "next/server";
import { getDbBackendInfo } from "@/lib/db";
import { isMongoEnabled, getMongoDbName } from "@/lib/mongo";

export async function GET() {
  const info = await getDbBackendInfo();
  const isProd = process.env.NODE_ENV === "production";
  return NextResponse.json({
    mongodb_configured: isMongoEnabled(),
    mongodb_db: getMongoDbName(),
    active_backend: info.backend,
    mongo_ready: info.mongoReady,
    // Avoid leaking internal connection strings/details in production
    error: isProd ? (info.error ? "storage_unavailable" : null) : info.error || null,
    memory_layer: info.backend === "mongodb",
    note:
      info.backend === "mongodb"
        ? "Operational state + memory_events stored in MongoDB."
        : "Using local file data/db.json. Set MONGODB_URI for MongoDB memory layer.",
  });
}
