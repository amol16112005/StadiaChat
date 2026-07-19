import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchProtocol, protocolBody } from "../src/lib/protocol-match.ts";
import { buildUniversalProtocols, VENUE_LANDMARKS } from "../src/lib/protocol-pack.ts";

const metlife = VENUE_LANDMARKS.find((v) => v.id === "metlife_2026");
assert.ok(metlife);
const protocols = buildUniversalProtocols(metlife!);

describe("matchProtocol", () => {
  it("matches ADA / elevator FAQ", () => {
    const m = matchProtocol(
      "Where is the nearest ADA elevator to Gate 3?",
      protocols,
      "faq"
    );
    assert.ok(m);
    assert.match(m!.title, /ADA|Elevator/i);
  });

  it("matches food / concessions FAQ", () => {
    const m = matchProtocol(
      "Where can I buy food near section 110?",
      protocols,
      "faq"
    );
    assert.ok(m);
    assert.match(m!.title, /Food|Concession/i);
  });

  it("matches missing child emergency", () => {
    const m = matchProtocol(
      "Missing child near Gate 3 last seen in red shirt",
      protocols,
      "emergency"
    );
    assert.ok(m);
    assert.match(m!.title, /Missing|Child/i);
  });

  it("matches unattended bag emergency", () => {
    const m = matchProtocol(
      "unattended bag by restrooms on concourse",
      protocols,
      "emergency"
    );
    assert.ok(m);
    assert.match(m!.title, /Bag|Unattended/i);
  });

  it("returns null for weak unrelated text", () => {
    const m = matchProtocol("hello there", protocols, "faq");
    assert.equal(m, null);
  });

  it("protocolBody prefers language then en", () => {
    const p = protocols[0]!;
    const en = protocolBody(p, "en");
    assert.ok(en.length > 0);
    const missing = protocolBody(p, "xx-lang");
    assert.equal(missing, en);
  });
});
