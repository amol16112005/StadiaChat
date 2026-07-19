import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rateLimit } from "../src/lib/rate-limit.ts";

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `test-ok-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      const r = rateLimit(key, { limit: 3, windowMs: 60_000 });
      assert.equal(r.ok, true);
    }
  });

  it("blocks when limit exceeded", () => {
    const key = `test-block-${Date.now()}`;
    rateLimit(key, { limit: 2, windowMs: 60_000 });
    rateLimit(key, { limit: 2, windowMs: 60_000 });
    const blocked = rateLimit(key, { limit: 2, windowMs: 60_000 });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.ok(blocked.retryAfterSec >= 1);
    }
  });
});
