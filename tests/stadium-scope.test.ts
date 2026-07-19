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

  it("covers merch, guest services, wifi, prayer", () => {
    assert.equal(isInStadiumFacilityQuery("where is the merch shop"), true);
    assert.equal(isInStadiumFacilityQuery("guest services lost and found"), true);
    assert.equal(isInStadiumFacilityQuery("is there wifi on the concourse"), true);
    assert.equal(isInStadiumFacilityQuery("prayer room location"), true);
  });

  it("covers transit and weather as out of scope city patterns", () => {
    assert.equal(isOutOfStadiumScope("uber to the airport"), true);
    assert.equal(isOutOfStadiumScope("how is the weather"), true);
  });
});
