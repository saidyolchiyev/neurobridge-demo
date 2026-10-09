import test from "node:test";
import assert from "node:assert/strict";
import { initialRides } from "../data/mockRides.js";
import { explainMatch, findMatchingRides } from "./matchingService.js";

test("a Baku to Shamakhi passenger can match a Baku to Gabala route via Shamakhi", () => {
  const ride = initialRides.find((item) => item.destination === "Qəbələ");
  const result = explainMatch(ride, "Bakı", "Şamaxı");
  assert.equal(result.compatible, true);
  assert.equal(result.score, 93);
  assert.match(result.reasons[0], /yaxındır|üst-üstə/i);
});

test("matching rejects a passenger traveling opposite to the driver's direction", () => {
  const ride = initialRides.find((item) => item.origin === "Gəncə" && item.destination === "Bakı");
  assert.equal(explainMatch(ride, "Bakı", "Gəncə").compatible, false);
});

test("matching excludes rides without enough seats and returns stable scores", () => {
  const rides = findMatchingRides(initialRides, "Bakı", "Şamaxı", 3);
  assert.ok(rides.every((ride) => ride.seats >= 3));
  assert.equal(rides[0].match.score, findMatchingRides(initialRides, "Bakı", "Şamaxı", 3)[0].match.score);
});
