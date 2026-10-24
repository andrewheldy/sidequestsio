// GPS presence rules — mirror verify_gps_presence() in supabase/migrations/0025_gps_presence.sql.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPresence, distanceM, DEFAULT_VERIFICATION_RADIUS_M } from "../src/lib/app/presence";

const target = { latitude: 25.765491, longitude: -80.219374 }; // Domino Park (seed dataset)
const now = 1_800_000_000_000;
const ctx = { now, challengeCreatedAt: now - 2_000 };
const at = (dLat: number, accuracy: number, ageMs = 1_000) => ({
  latitude: target.latitude + dLat,
  longitude: target.longitude,
  accuracy,
  capturedAt: now - ageMs,
});

test("distanceM matches known distances", () => {
  assert.equal(distanceM(25.7617, -80.1918, 25.7617, -80.1918), 0);
  assert.equal(Math.round(distanceM(25.7743, -80.1937, 25.7907, -80.13)), 6634);
});

test("inside only when the whole accuracy circle is inside the radius", () => {
  assert.deepEqual(classifyPresence(at(0, 10), target, 100, ctx), { outcome: "inside", reason: "ok" });
  // ~89 m away ±10 m → 99 ≤ 100
  assert.equal(classifyPresence(at(0.0008, 10), target, 100, ctx).outcome, "inside");
  // ~100 m away ±10 m → neither clearly inside nor clearly outside
  assert.deepEqual(classifyPresence(at(0.0009, 10), target, 100, ctx), { outcome: "uncertain", reason: "ambiguous" });
  // ~111 m away ±10 m → nearest edge 101 m, clearly outside
  assert.equal(classifyPresence(at(0.001, 10), target, 100, ctx).outcome, "outside");
});

test("outside only when the whole accuracy circle is outside the radius", () => {
  assert.deepEqual(classifyPresence(at(0.009, 10), target, 100, ctx), { outcome: "outside", reason: "outside_radius" });
});

test("poor, stale, future or missing samples are uncertain — never a wider radius", () => {
  assert.equal(classifyPresence(at(0, 60), target, 100, ctx).reason, "low_accuracy");
  assert.equal(classifyPresence(at(0, 10, 31_000), target, 100, ctx).reason, "stale_sample");
  // captured before the challenge existed (beyond the 5 s skew)
  assert.equal(
    classifyPresence(at(0, 10, 1_000), target, 100, { now, challengeCreatedAt: now + 5_000 }).reason,
    "stale_sample",
  );
  assert.equal(classifyPresence(at(0, 10, -60_000), target, 100, ctx).reason, "invalid_sample");
  assert.equal(classifyPresence(null, target, 100, ctx).reason, "invalid_sample");
  assert.equal(classifyPresence(at(0, 10), null, 100, ctx).reason, "invalid_sample");
});

test("radius defaults to 100 m", () => {
  // ~67 m ±30 m → 97 ≤ 100 inside with the default
  assert.equal(classifyPresence(at(0.0006, 30), target, null, ctx).outcome, "inside");
  assert.equal(DEFAULT_VERIFICATION_RADIUS_M, 100);
});
