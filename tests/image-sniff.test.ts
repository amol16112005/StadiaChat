import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sniffImage } from "../src/lib/image-sniff.ts";

describe("sniffImage", () => {
  it("detects JPEG", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(12).fill(0)]);
    assert.deepEqual(sniffImage(buf), { ext: ".jpg", mime: "image/jpeg" });
  });

  it("detects PNG", () => {
    const buf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]);
    assert.deepEqual(sniffImage(buf), { ext: ".png", mime: "image/png" });
  });

  it("rejects random bytes", () => {
    assert.equal(sniffImage(Buffer.from("not-an-image!!!!")), null);
  });

  it("rejects empty", () => {
    assert.equal(sniffImage(Buffer.alloc(0)), null);
  });
});
