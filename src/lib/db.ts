import { promises as fs } from "fs";
import path from "path";
import type {
  ChatMessage,
  Database,
  Incident,
  OpsPlan,
  Protocol,
  Stadium,
  User,
} from "./types";
import { seedDatabase } from "./seed";
import {
  getMongoDb,
  getStorageBackend,
  isMongoEnabled,
  type StorageBackend,
} from "./mongo";
import { appendMemory, ensureMemoryIndexes } from "./memory";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const STATE_ID = "stadiachat_main";

let writeQueue: Promise<void> = Promise.resolve();
let cachedBackend: StorageBackend | null = null;

function migrate(db: Database): Database {
  if (!Array.isArray(db.ops_plans)) db.ops_plans = [];
  if (!Array.isArray(db.incidents)) db.incidents = [];
  if (!Array.isArray(db.messages)) db.messages = [];
  if (!Array.isArray(db.stadiums)) db.stadiums = [];
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.protocols)) db.protocols = [];
  return db;
}

async function resolveBackend(): Promise<StorageBackend> {
  if (cachedBackend) return cachedBackend;
  const status = await getStorageBackend();
  cachedBackend = status.backend;
  if (status.backend === "mongodb") {
    console.info("[db] using MongoDB memory layer");
  } else if (isMongoEnabled() && status.error) {
    console.warn("[db] MongoDB unavailable, falling back to file:", status.error);
  }
  return cachedBackend;
}

// ── File store ──────────────────────────────────────────────────────────────

async function ensureFileDb(): Promise<Database> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return migrate(JSON.parse(raw) as Database);
  } catch {
    const seed = seedDatabase();
    await fs.writeFile(DB_PATH, JSON.stringify(seed, null, 2), "utf-8");
    return seed;
  }
}

async function writeFileDb(db: Database): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// ── MongoDB store (single state doc + memory_events collection) ─────────────

async function ensureMongoDb(): Promise<Database> {
  const mdb = await getMongoDb();
  if (!mdb) throw new Error("MongoDB not available");

  await ensureMemoryIndexes(mdb);
  const col = mdb.collection("app_state");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = (await col.findOne({ _id: STATE_ID } as any)) as
    | { data?: Database }
    | null;

  if (doc?.data) {
    return migrate(doc.data);
  }

  const seed = seedDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await col.replaceOne(
    { _id: STATE_ID } as any,
    {
      _id: STATE_ID,
      data: seed,
      updated_at: new Date().toISOString(),
    } as any,
    { upsert: true }
  );
  // Also mirror collections for easy querying in Compass
  await mirrorCollections(seed);
  return seed;
}

async function writeMongoDb(db: Database): Promise<void> {
  const mdb = await getMongoDb();
  if (!mdb) throw new Error("MongoDB not available");

  const col = mdb.collection("app_state");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await col.replaceOne(
    { _id: STATE_ID } as any,
    {
      _id: STATE_ID,
      data: db,
      updated_at: new Date().toISOString(),
    } as any,
    { upsert: true }
  );
  await mirrorCollections(db);
}

/** Optional query-friendly mirrors (indexes for stadium filters) */
async function mirrorCollections(db: Database): Promise<void> {
  const mdb = await getMongoDb();
  if (!mdb) return;

  const writeCol = async <T extends { id: string }>(
    name: string,
    rows: T[]
  ) => {
    const c = mdb.collection(name);
    await c.deleteMany({});
    if (rows.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await c.insertMany(rows.map((r) => ({ ...r, _id: r.id })) as any);
    }
  };

  await Promise.all([
    writeCol<Stadium>("stadiums", db.stadiums),
    writeCol<User>("users", db.users),
    writeCol<Protocol>("protocols", db.protocols),
    writeCol<ChatMessage>("messages", db.messages),
    writeCol<Incident>("incidents", db.incidents),
    writeCol<OpsPlan>("ops_plans", db.ops_plans || []),
  ]);
}

// ── Public API (backend-agnostic) ───────────────────────────────────────────

async function ensureDb(): Promise<Database> {
  const backend = await resolveBackend();
  if (backend === "mongodb") {
    try {
      return await ensureMongoDb();
    } catch (e) {
      console.error("[db] mongo ensure failed, file fallback:", e);
      cachedBackend = "file";
      return ensureFileDb();
    }
  }
  return ensureFileDb();
}

async function writeDb(db: Database): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const backend = await resolveBackend();
    if (backend === "mongodb") {
      try {
        await writeMongoDb(db);
        return;
      } catch (e) {
        console.error("[db] mongo write failed, file fallback:", e);
        cachedBackend = "file";
      }
    }
    await writeFileDb(db);
  });
  await writeQueue;
}

export async function getDb(): Promise<Database> {
  return ensureDb();
}

export async function updateDb(
  mutator: (db: Database) => void | Promise<void>
): Promise<Database> {
  const db = await ensureDb();
  await mutator(db);
  await writeDb(db);
  return db;
}

export async function resetDb(): Promise<Database> {
  const seed = seedDatabase();
  cachedBackend = null; // re-detect
  const backend = await resolveBackend();
  if (backend === "mongodb") {
    try {
      const mdb = await getMongoDb();
      if (mdb) {
        await mdb.collection("memory_events").deleteMany({});
        await ensureMemoryIndexes(mdb);
      }
      await writeMongoDb(seed);
      return seed;
    } catch (e) {
      console.error("[db] mongo reset failed:", e);
      cachedBackend = "file";
    }
  }
  await writeFileDb(seed);
  return seed;
}

export async function getDbBackendInfo() {
  cachedBackend = null;
  return getStorageBackend();
}

export async function getStadium(stadiumId: string) {
  const db = await getDb();
  return db.stadiums.find((s) => s.id === stadiumId) ?? null;
}

export async function getUserById(userId: string) {
  const db = await getDb();
  return db.users.find((u) => u.id === userId) ?? null;
}

export async function getOpsLead(stadiumId: string) {
  const db = await getDb();
  return (
    db.users.find(
      (u) =>
        u.stadium_id === stadiumId &&
        u.role === "Operations_Lead" &&
        u.status === "approved"
    ) ?? null
  );
}

export async function getStadiumUsers(stadiumId: string) {
  const db = await getDb();
  return db.users.filter((u) => u.stadium_id === stadiumId);
}

export async function getStadiumProtocols(stadiumId: string) {
  const db = await getDb();
  return db.protocols.filter((p) => p.stadium_id === stadiumId);
}

export async function getStadiumMessages(stadiumId: string) {
  const db = await getDb();
  return db.messages
    .filter((m) => m.stadium_id === stadiumId)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}

export async function getUserMessages(userId: string, stadiumId: string) {
  const db = await getDb();
  return db.messages
    .filter(
      (m) =>
        m.stadium_id === stadiumId &&
        (m.sender_id === userId ||
          m.recipient_id === userId ||
          m.recipient_id === "broadcast_volunteer")
    )
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}

export async function getOpsMessages(stadiumId: string) {
  const db = await getDb();
  return db.messages
    .filter(
      (m) =>
        m.stadium_id === stadiumId &&
        (m.recipient_id === "broadcast_ops" ||
          m.ui_component === "alert_card" ||
          m.ui_component === "serious_alert" ||
          m.sender_role === "Operations_Lead" ||
          m.sender_role === "System")
    )
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}

export async function addMessage(message: ChatMessage): Promise<ChatMessage> {
  await updateDb((db) => {
    db.messages.push(message);
  });

  // Memory layer (Mongo only — no-op if disabled)
  void appendMemory({
    stadium_id: message.stadium_id,
    user_id: message.sender_id,
    user_name: message.sender_name,
    role: message.sender_role,
    kind:
      message.ui_component === "actionable_task_card"
        ? "task"
        : message.category === "C" || message.category === "D"
          ? "incident"
          : message.sender_role === "System"
            ? "system"
            : "chat",
    text: message.text,
    category: message.category,
    metadata: {
      message_id: message.id,
      ui_component: message.ui_component,
      recipient_id: message.recipient_id,
      has_attachments: Boolean(message.attachments?.length),
    },
    created_at: message.created_at,
  }).catch((e) => console.warn("[memory] append failed", e));

  return message;
}

export async function addIncident(incident: Incident): Promise<Incident> {
  await updateDb((db) => {
    db.incidents.push(incident);
  });

  void appendMemory({
    stadium_id: incident.stadium_id,
    user_id: incident.reporter_id,
    user_name: incident.reporter_name,
    kind: "incident",
    text: incident.text,
    category: incident.category,
    metadata: {
      incident_id: incident.id,
      severity: incident.severity,
      status: incident.status,
    },
    created_at: incident.created_at,
  }).catch((e) => console.warn("[memory] incident append failed", e));

  return incident;
}

export async function updateIncident(
  incidentId: string,
  patch: Partial<Incident>
): Promise<Incident | null> {
  let updated: Incident | null = null;
  await updateDb((db) => {
    const idx = db.incidents.findIndex((i) => i.id === incidentId);
    if (idx === -1) return;
    db.incidents[idx] = { ...db.incidents[idx], ...patch };
    updated = db.incidents[idx];
  });
  return updated;
}

export async function updateUser(
  userId: string,
  patch: Partial<User>
): Promise<User | null> {
  let updated: User | null = null;
  await updateDb((db) => {
    const idx = db.users.findIndex((u) => u.id === userId);
    if (idx === -1) return;
    db.users[idx] = { ...db.users[idx], ...patch };
    updated = db.users[idx];
  });
  return updated;
}

export async function getOpenSeriousIncidents(stadiumId: string) {
  const db = await getDb();
  return db.incidents.filter(
    (i) =>
      i.stadium_id === stadiumId &&
      i.severity === "serious" &&
      i.status === "open"
  );
}

export async function getStadiumIncidents(stadiumId: string) {
  const db = await getDb();
  return db.incidents
    .filter((i) => i.stadium_id === stadiumId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}
