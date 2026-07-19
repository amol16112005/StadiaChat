import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { seedDatabase } from "../src/lib/seed.ts";
import { buildAllProtocols } from "../src/lib/protocol-pack.ts";

describe("seed + protocol pack integrity", () => {
  it("seeds 6 stadiums with ops credentials and pins", () => {
    const db = seedDatabase();
    assert.equal(db.stadiums.length, 6);
    for (const s of db.stadiums) {
      assert.ok(s.pin.length >= 4);
      assert.ok(s.ops_credential.startsWith("ops_"));
    }
  });

  it("seeds approved demo volunteers and ops leads", () => {
    const db = seedDatabase();
    const leads = db.users.filter((u) => u.role === "Operations_Lead");
    const vols = db.users.filter(
      (u) => u.role === "Volunteer" && u.status === "approved"
    );
    assert.equal(leads.length, 6);
    assert.ok(vols.length >= 6);
    assert.ok(vols.some((v) => v.name === "Alex Rivera"));
  });

  it("builds 162 protocol records (27 × 6)", () => {
    const all = buildAllProtocols();
    assert.equal(all.length, 162);
    const faqs = all.filter((p) => p.category === "faq");
    const emg = all.filter((p) => p.category === "emergency");
    assert.equal(faqs.length, 16 * 6);
    assert.equal(emg.length, 11 * 6);
  });

  it("isolates protocols per stadium_id", () => {
    const all = buildAllProtocols();
    const met = all.filter((p) => p.stadium_id === "metlife_2026");
    const sofi = all.filter((p) => p.stadium_id === "sofi_2026");
    assert.equal(met.length, 27);
    assert.equal(sofi.length, 27);
    assert.ok(met.every((p) => p.id.includes("metlife_2026")));
  });
});
