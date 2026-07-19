import type { Db } from "mongodb";
import { getMongoDb, isMongoEnabled } from "./mongo";
import { newId } from "./id";

/**
 * Long-term operational memory layer (MongoDB).
 * Stores searchable events per stadium/user for AI context and audit.
 */

export type MemoryKind =
  | "chat"
  | "incident"
  | "plan"
  | "task"
  | "fan_assist"
  | "system"
  | "note";

export interface MemoryEvent {
  id: string;
  stadium_id: string;
  user_id?: string;
  user_name?: string;
  role?: string;
  kind: MemoryKind;
  text: string;
  category?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const COLLECTION = "memory_events";
const MAX_RECENT = 40;

async function col() {
  if (!isMongoEnabled()) return null;
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection<MemoryEvent>(COLLECTION);
}

export async function ensureMemoryIndexes(db?: Db): Promise<void> {
  const database = db || (await getMongoDb());
  if (!database) return;
  const c = database.collection(COLLECTION);
  await c.createIndex({ stadium_id: 1, created_at: -1 });
  await c.createIndex({ stadium_id: 1, user_id: 1, created_at: -1 });
  await c.createIndex({ kind: 1, created_at: -1 });
}

export async function appendMemory(
  event: Omit<MemoryEvent, "id" | "created_at"> & {
    id?: string;
    created_at?: string;
  }
): Promise<MemoryEvent | null> {
  const c = await col();
  if (!c) return null;

  const doc: MemoryEvent = {
    id: event.id || newId("mem"),
    stadium_id: event.stadium_id,
    user_id: event.user_id,
    user_name: event.user_name,
    role: event.role,
    kind: event.kind,
    text: event.text,
    category: event.category,
    metadata: event.metadata,
    created_at: event.created_at || new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await c.insertOne({ ...doc, _id: doc.id } as any);
  return doc;
}

export async function getRecentMemory(options: {
  stadium_id: string;
  user_id?: string;
  limit?: number;
  kinds?: MemoryKind[];
}): Promise<MemoryEvent[]> {
  const c = await col();
  if (!c) return [];

  const filter: Record<string, unknown> = {
    stadium_id: options.stadium_id,
  };
  if (options.user_id) filter.user_id = options.user_id;
  if (options.kinds?.length) filter.kind = { $in: options.kinds };

  const limit = Math.min(options.limit ?? MAX_RECENT, 100);
  const rows = await c
    .find(filter)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();

  return rows
    .map((r) => ({
      id: r.id,
      stadium_id: r.stadium_id,
      user_id: r.user_id,
      user_name: r.user_name,
      role: r.role,
      kind: r.kind,
      text: r.text,
      category: r.category,
      metadata: r.metadata,
      created_at: r.created_at,
    }))
    .reverse();
}

/** Compact string block for LLM system/user context */
export async function formatMemoryForAi(options: {
  stadium_id: string;
  user_id?: string;
  limit?: number;
}): Promise<string> {
  const events = await getRecentMemory({
    stadium_id: options.stadium_id,
    user_id: options.user_id,
    limit: options.limit ?? 15,
  });
  if (!events.length) return "";

  const lines = events.map(
    (e) =>
      `- [${e.created_at}] (${e.kind}${e.category ? `/${e.category}` : ""}) ${e.user_name || e.user_id || "system"}: ${e.text.slice(0, 240)}`
  );
  return `Recent stadium memory (do not invent beyond this):\n${lines.join("\n")}`;
}

export async function clearStadiumMemory(stadiumId?: string): Promise<number> {
  const c = await col();
  if (!c) return 0;
  const filter = stadiumId ? { stadium_id: stadiumId } : {};
  const res = await c.deleteMany(filter);
  return res.deletedCount;
}
