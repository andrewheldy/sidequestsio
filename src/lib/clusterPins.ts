/**
 * Greedy screen-space clustering for map pins: walks points in order and
 * groups every not-yet-grouped point within `radiusPx` of a group's first
 * point. Deterministic for a given input order. Used to merge pins that
 * would otherwise cover each other (QuestMap).
 */
export function clusterByPixel<T extends { x: number; y: number }>(points: T[], radiusPx: number): T[][] {
  const groups: T[][] = [];
  const taken = new Array<boolean>(points.length).fill(false);
  for (let i = 0; i < points.length; i++) {
    if (taken[i]) continue;
    taken[i] = true;
    const seed = points[i];
    const group = [seed];
    for (let j = i + 1; j < points.length; j++) {
      if (taken[j]) continue;
      if (Math.hypot(points[j].x - seed.x, points[j].y - seed.y) <= radiusPx) {
        taken[j] = true;
        group.push(points[j]);
      }
    }
    groups.push(group);
  }
  return groups;
}
