import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  decodeSessionCookie,
  encodeSessionCookie,
} from "../src/lib/session-crypto.ts";

describe("session cookie crypto", () => {
  const secret = "unit-test-secret-abc";

  it("round-trips user id", () => {
    const raw = encodeSessionCookie("vol_123", secret);
    const decoded = decodeSessionCookie(raw, secret);
    assert.deepEqual(decoded, { userId: "vol_123" });
  });

  it("rejects tampered payload", () => {
    const raw = encodeSessionCookie("vol_123", secret);
    const [payload] = raw.split(".");
    const forged = `${payload}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`;
    assert.equal(decodeSessionCookie(forged, secret), null);
  });

  it("rejects wrong secret", () => {
    const raw = encodeSessionCookie("vol_123", secret);
    assert.equal(decodeSessionCookie(raw, "other-secret"), null);
  });

  it("rejects role-injection style unsigned json", () => {
    const fake = Buffer.from(
      JSON.stringify({ user_id: "x", user_role: "Operations_Lead" })
    ).toString("base64url");
    assert.equal(decodeSessionCookie(fake, secret), null);
  });
});
