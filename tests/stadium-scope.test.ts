import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isInStadiumFacilityQuery,
  isOutOfStadiumScope,
} from "../src/lib/stadium-scope.ts";

describe("stadium-scope facility vs city", () => {
  it("treats ADA / restroom / food as in-stadium facilities", () => {
    assert.equal(
      isInStadiumFacilityQuery("Where is the nearest ADA elevator to Gate 3?"),
      true
    );
    assert.equal(isInStadiumFacilityQuery("Where is the restroom?"), true);
    assert.equal(
      isInStadiumFacilityQuery("food stall near section 110"),
      true
    );
    assert.equal(isOutOfStadiumScope("Where is the restroom?"), false);
  });

  it("treats pure city tourism as out of scope", () => {
    assert.equal(
      isOutOfStadiumScope("Best restaurants near the stadium downtown?"),
      true
    );
    assert.equal(isOutOfStadiumScope("hotel near the stadium"), true);
    assert.equal(isOutOfStadiumScope("uber to the airport"), true);
  });

  it("keeps explicit in-stadium restaurants in scope", () => {
    assert.equal(
      isInStadiumFacilityQuery("restaurant inside the stadium concourse"),
      true
    );
    assert.equal(
      isOutOfStadiumScope("restaurant inside the stadium concourse"),
      false
    );
  });
});
