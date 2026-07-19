import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeSecretEqual, str } from "../src/lib/safe-equal.ts";

describe("http helpers", () => {
  it("safeSecretEqual is true for equal secrets", () => {
    assert.equal(safeSecretEqual("token-abc", "token-abc"), true);
  });

  it("safeSecretEqual is false for different secrets", () => {
    assert.equal(safeSecretEqual("token-abc", "token-xyz"), false);
    assert.equal(safeSecretEqual("short", "longer-secret"), false);
  });

  it("str trims body fields", () => {
    assert.equal(str({ name: "  Alex  " }, "name"), "Alex");
    assert.equal(str({}, "missing"), "");
  });
});
