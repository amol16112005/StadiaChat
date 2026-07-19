import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedDatabase } from "../src/lib/seed.ts";

/**
 * Tenancy invariants from seed data — mirrors runtime filters by stadium_id.
 */
describe("stadium tenancy invariants", () => {
  it("each volunteer belongs to exactly one seeded stadium", () => {
    const db = seedDatabase();
    const stadiumIds = new Set(db.stadiums.map((s) => s.id));
    for (const u of db.users) {
      assert.ok(stadiumIds.has(u.stadium_id), u.id);
    }
  });

  it("ops credential is unique per stadium", () => {
    const db = seedDatabase();
    const creds = db.stadiums.map((s) => s.ops_credential);
    assert.equal(new Set(creds).size, creds.length);
  });

  it("message filters would isolate stadiums", () => {
    // Simulate tenancy filter used by GET /api/messages
    const db = seedDatabase();
    const stadiumId = "metlife_2026";
    const foreign = {
      id: "msg_x",
      stadium_id: "sofi_2026",
      sender_id: "x",
      sender_name: "x",
      sender_role: "Volunteer" as const,
      recipient_id: "y",
      text: "leak",
      created_at: new Date().toISOString(),
    };
    db.messages.push(foreign);
    const scoped = db.messages.filter((m) => m.stadium_id === stadiumId);
    assert.ok(scoped.every((m) => m.stadium_id === stadiumId));
    assert.ok(!scoped.some((m) => m.id === "msg_x"));
  });
});
