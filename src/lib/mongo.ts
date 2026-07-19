import { MongoClient, type Db } from "mongodb";

/**
 * MongoDB connection (memory + operational store).
 * Set in `.env.local`:
 *   MONGODB_URI=mongodb+srv://user:pass@cluster/...
 *   MONGODB_DB=stadiachat   (optional, default stadiachat)
 */

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export function isMongoEnabled(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim());
}

export function getMongoDbName(): string {
  return process.env.MONGODB_DB?.trim() || "stadiachat";
}

export async function getMongoClient(): Promise<MongoClient | null> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) return null;

  if (client) return client;
  if (!clientPromise) {
    clientPromise = MongoClient.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    })
      .then((c) => {
        client = c;
        return c;
      })
      .catch((err) => {
        clientPromise = null;
        console.error("[mongo] connection failed:", err);
        throw err;
      });
  }
  return clientPromise;
}

export async function getMongoDb(): Promise<Db | null> {
  const c = await getMongoClient();
  if (!c) return null;
  return c.db(getMongoDbName());
}

export type StorageBackend = "mongodb" | "file";

export async function getStorageBackend(): Promise<{
  backend: StorageBackend;
  mongoReady: boolean;
  error?: string;
}> {
  if (!isMongoEnabled()) {
    return { backend: "file", mongoReady: false };
  }
  try {
    const db = await getMongoDb();
    if (!db) return { backend: "file", mongoReady: false };
    await db.command({ ping: 1 });
    return { backend: "mongodb", mongoReady: true };
  } catch (e) {
    return {
      backend: "file",
      mongoReady: false,
      error: e instanceof Error ? e.message : "MongoDB unavailable",
    };
  }
}
