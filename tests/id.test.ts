import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { newId } from "../src/lib/id.ts";

describe("newId", () => {
  it("prefixes and is unique", () => {
    const a = newId("vol");
    const b = newId("vol");
    assert.match(a, /^vol_[a-f0-9]+$/);
    assert.match(b, /^vol_[a-f0-9]+$/);
    assert.notEqual(a, b);
  });
});
