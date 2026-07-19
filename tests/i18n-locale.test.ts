import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const localesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/lib/locales"
);

function normalizeLang(code?: string | null): string {
  if (!code) return "en";
  const c = code.toLowerCase().slice(0, 2);
  const known = new Set([
    "en",
    "es",
    "fr",
    "pt",
    "de",
    "ar",
    "ja",
    "ko",
    "zh",
    "it",
    "hi",
  ]);
  return known.has(c) ? c : "en";
}

describe("i18n locales", () => {
  it("normalizeLang maps known codes and falls back", () => {
    assert.equal(normalizeLang("en-US"), "en");
    assert.equal(normalizeLang("es"), "es");
    assert.equal(normalizeLang("zz"), "en");
    assert.equal(normalizeLang(null), "en");
  });

  it("all locale files contain required home criteria + a11y keys", () => {
    const required = [
      "home.problemTitle",
      "home.criteriaTitle",
      "home.criteria1Label",
      "home.criteria6Body",
      "home.skipToAccess",
      "home.jq1",
      "home.dq7",
      "vol.skipToComposer",
      "vol.chatLabel",
      "ops.skipToMain",
      "ops.feedLabel",
    ];
    const files = readdirSync(localesDir).filter((f) => f.endsWith(".json"));
    assert.ok(files.length >= 10);
    for (const f of files) {
      const data = JSON.parse(
        readFileSync(path.join(localesDir, f), "utf8")
      ) as Record<string, string>;
      for (const k of required) {
        assert.ok(data[k], `${f} missing ${k}`);
      }
    }
  });

  it("English problem statement is substantial", () => {
    const en = JSON.parse(
      readFileSync(path.join(localesDir, "en.json"), "utf8")
    ) as Record<string, string>;
    assert.ok(en["home.problemBody"].length > 80);
    assert.ok(en["home.criteria2Body"].toLowerCase().includes("session"));
  });
});
