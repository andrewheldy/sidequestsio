// Screen-space pin clustering (QuestMap): pins closer than one pin-width merge.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clusterByPixel } from "../src/lib/clusterPins";

const pt = (id: string, x: number, y: number) => ({ id, x, y });
const ids = (groups: { id: string }[][]) => groups.map((g) => g.map((p) => p.id));

test("pins within the radius merge; distant pins stay separate", () => {
  const groups = clusterByPixel([pt("a", 0, 0), pt("b", 30, 0), pt("c", 200, 0)], 40);
  assert.deepEqual(ids(groups), [["a", "b"], ["c"]]);
});

test("every pin lands in exactly one group", () => {
  const points = Array.from({ length: 50 }, (_, i) => pt(String(i), (i * 37) % 300, (i * 53) % 300));
  const flat = ids(clusterByPixel(points, 44)).flat().sort();
  assert.deepEqual(flat, points.map((p) => p.id).sort());
});

test("identical positions always merge; radius 0 keeps distinct pins apart", () => {
  assert.deepEqual(ids(clusterByPixel([pt("a", 5, 5), pt("b", 5, 5)], 0)), [["a", "b"]]);
  assert.deepEqual(ids(clusterByPixel([pt("a", 0, 0), pt("b", 1, 0)], 0)), [["a"], ["b"]]);
});

test("grouping is deterministic for the same input order", () => {
  const points = [pt("a", 0, 0), pt("b", 40, 0), pt("c", 80, 0)];
  // b joins a's group (40 ≤ 44); c is 80 from the seed a, so it starts its own.
  assert.deepEqual(ids(clusterByPixel(points, 44)), [["a", "b"], ["c"]]);
  assert.deepEqual(ids(clusterByPixel(points, 44)), ids(clusterByPixel(points, 44)));
});
