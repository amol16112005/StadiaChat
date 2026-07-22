import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { heuristicClassify } from "../src/lib/heuristic-classify.ts";

describe("heuristicClassify A–D", () => {
  it("A: facility / wayfinding", () => {
    assert.equal(heuristicClassify("Where is the restroom?"), "A");
    assert.equal(heuristicClassify("ADA elevator Gate 3"), "A");
    assert.equal(heuristicClassify("food stall near section 110"), "A");
  });

  it("B: city / tourism out of scope", () => {
    assert.equal(
      heuristicClassify("Best restaurants near the stadium downtown?"),
      "B"
    );
    assert.equal(heuristicClassify("hotel near the stadium"), "B");
  });

  it("C: minor floor issues", () => {
    assert.equal(heuristicClassify("Low brochure inventory needs restock"), "C");
    assert.equal(heuristicClassify("spill needs cleanup by trash bins"), "C");
    assert.equal(heuristicClassify("broken printer missing supplies"), "C");
  });

  it("D: critical safety", () => {
    assert.equal(heuristicClassify("Missing child near Gate 3"), "D");
    assert.equal(heuristicClassify("medical distress section 112"), "D");
    assert.equal(heuristicClassify("unattended bag by restrooms"), "D");
    assert.equal(heuristicClassify("fire smoke near concessions"), "D");
  });

  it("never classifies in-stadium food as B", () => {
    assert.notEqual(
      heuristicClassify("where to eat inside the stadium concourse"),
      "B"
    );
  });

  it("question-shaped free text routes to A (not null → C)", () => {
    assert.equal(
      heuristicClassify("How should I handle a fan who lost their phone?"),
      "A"
    );
    assert.equal(
      heuristicClassify("What radio channel do I use for medical?"),
      "A"
    );
  });
});
