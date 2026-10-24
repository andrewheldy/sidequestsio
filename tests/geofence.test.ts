// Geofence rule tests — mirror the cases verified against complete_quest() (0024).
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkGeofence, distanceM, DEFAULT_GEOFENCE_RADIUS_M } from "../src/lib/app/geofence";

const venue = { latitude: 25.765491, longitude: -80.219374 }; // Domino Park (seed dataset)
const at = (dLat: number, accuracy: number) => ({
  latitude: venue.latitude + dLat,
  longitude: venue.longitude,
  accuracy,
});

test("distanceM matches known distances", () => {
  assert.equal(distanceM(25.7617, -80.1918, 25.7617, -80.1918), 0);
  // Same pair the SQL twin returned 6634 m for on staging.
  assert.equal(Math.round(distanceM(25.7743, -80.1937, 25.7907, -80.13)), 6634);
});

test("missing or invalid position → location_required", () => {
  assert.deepEqual(checkGeofence(null, venue, 75), { ok: false, error: "location_required" });
  assert.deepEqual(checkGeofence({ latitude: 123, longitude: 0, accuracy: 5 }, venue, 75), {
    ok: false,
    error: "location_required",
  });
});

test("poor accuracy → location_inaccurate", () => {
  assert.deepEqual(checkGeofence(at(0, 500), venue, 75), { ok: false, error: "location_inaccurate" });
  assert.deepEqual(checkGeofence(at(0, Number.NaN), venue, 75), { ok: false, error: "location_inaccurate" });
});

test("outside the radius plus accuracy allowance → outside_geofence", () => {
  assert.deepEqual(checkGeofence(at(0.009, 10), venue, 75), {
    ok: false,
    error: "outside_geofence",
    distanceM: 1001,
    radiusM: 75,
  });
  // 111 m away, 75 m radius, ±10 m → 85 m allowed.
  assert.equal(checkGeofence(at(0.001, 10), venue, 75).ok, false);
});

test("inside the radius, or within the capped accuracy allowance → ok", () => {
  assert.equal(checkGeofence(at(0, 5), venue, 75).ok, true);
  // 111 m away, 75 m radius, ±50 m → 125 m allowed (same as the SQL case).
  assert.equal(checkGeofence(at(0.001, 50), venue, 75).ok, true);
  // Allowance is capped at 50 m even when accuracy is reported as 90 m.
  assert.equal(checkGeofence(at(0.0013, 90), venue, 75).ok, false);
});

test("radius defaults to 150 m", () => {
  const r = checkGeofence(at(0.0012, 5), venue, null); // ~133 m
  assert.deepEqual(r, { ok: true, distanceM: 133, radiusM: DEFAULT_GEOFENCE_RADIUS_M });
});
