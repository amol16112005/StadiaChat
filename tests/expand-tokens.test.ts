import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expandQueryTokens } from "../src/lib/stadium-scope.ts";
import {
  DEFAULT_MESSAGE_LIMIT,
  MAX_MESSAGE_LIMIT,
  SAFETY_OVERRIDE_SECONDS,
} from "../src/lib/ops-constants.ts";

describe("expandQueryTokens + ops constants", () => {
  it("expands food synonyms into tokens", () => {
    const tokens = expandQueryTokens("Where is the food stall?");
    assert.ok(tokens.includes("food") || tokens.some((t) => t.includes("food")));
    assert.ok(tokens.includes("stall") || tokens.includes("food"));
  });

  it("safety override is 300 seconds", () => {
    assert.equal(SAFETY_OVERRIDE_SECONDS, 300);
  });

  it("message limits are sensible", () => {
    assert.equal(DEFAULT_MESSAGE_LIMIT, 200);
    assert.ok(MAX_MESSAGE_LIMIT >= DEFAULT_MESSAGE_LIMIT);
  });
});
