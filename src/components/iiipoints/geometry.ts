/** SVG path builders for the /iiipoints doorway and spark motifs. */

/**
 * The sidequests doorway as geometry: an arch with legs, centred on `cx`,
 * standing on `baseY`. Mirrors brand/logos/icon.svg (outer radius 19, inner 12,
 * on a 64 grid), scaled by `s` so it can be drawn at poster size.
 */
export function doorPath(cx: number, baseY: number, s: number) {
  const outer = 19 * s;
  const inner = 12 * s;
  const archY = baseY - 27 * s; // where the legs meet the arch
  return [
    `M${cx - outer} ${baseY}`,
    `V${archY}`,
    `A${outer} ${outer} 0 0 1 ${cx + outer} ${archY}`,
    `V${baseY}`,
    `H${cx + inner}`,
    `V${archY}`,
    `A${inner} ${inner} 0 0 0 ${cx - inner} ${archY}`,
    `V${baseY}`,
    'Z',
  ].join(' ');
}

/** The opening inside the doorway (what you see through it). */
export function doorOpening(cx: number, baseY: number, s: number) {
  const inner = 12 * s;
  const archY = baseY - 27 * s;
  return `M${cx - inner} ${baseY} V${archY} A${inner} ${inner} 0 0 1 ${cx + inner} ${archY} V${baseY} Z`;
}

/** A four-point discovery spark centred on (x, y). */
export function sparkPath(x: number, y: number, r: number) {
  const k = r * 0.28;
  return `M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`;
}
