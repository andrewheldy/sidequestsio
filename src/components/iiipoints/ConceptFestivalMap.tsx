import { CSSProperties, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { HIDDEN_DOOR, MAP_EDGES, MAP_NODES, MapNode } from './data';
import { useQuestState } from './QuestState';
import { doorOpening, doorPath } from './geometry';
import { SectionHead } from './shared';

type Layout = 'wide' | 'tall';
type Pt = [number, number];

const byId = Object.fromEntries(MAP_NODES.map((n) => [n.id, n])) as Record<string, MapNode>;
const pt = (n: MapNode, layout: Layout): Pt => (layout === 'wide' ? [n.x, n.y] : [n.mx, n.my]);

/** Circuit-style trace: one elbow, taking the longer axis first. */
function trace([x1, y1]: Pt, [x2, y2]: Pt) {
  if (Math.abs(x2 - x1) >= Math.abs(y2 - y1)) {
    const mx = (x1 + x2) / 2;
    return `M${x1} ${y1} H${mx} V${y2} H${x2}`;
  }
  const my = (y1 + y2) / 2;
  return `M${x1} ${y1} V${my} H${x2} V${y2}`;
}

/** Shortest hop route from the entrance to `target` (breadth-first). */
function routeTo(target: string): string[] {
  const adj: Record<string, string[]> = {};
  for (const [a, b] of MAP_EDGES) {
    (adj[a] ??= []).push(b);
    (adj[b] ??= []).push(a);
  }
  const prev: Record<string, string | null> = { you: null };
  const queue = ['you'];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === target) break;
    for (const nxt of adj[cur] ?? []) {
      if (!(nxt in prev)) {
        prev[nxt] = cur;
        queue.push(nxt);
      }
    }
  }
  const path: string[] = [];
  for (let at: string | null = target; at; at = prev[at] ?? null) path.unshift(at);
  return path;
}

function routeLength(route: string[]) {
  let len = 0;
  for (let i = 1; i < route.length; i++) {
    const a = byId[route[i - 1]];
    const b = byId[route[i]];
    len += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
  return len;
}

function MapTraces({ layout, route }: { layout: Layout; route: string[] }) {
  const size = layout === 'wide' ? '0 0 1000 640' : '0 0 600 960';
  const door = layout === 'wide' ? [HIDDEN_DOOR.x, HIDDEN_DOOR.y] : [HIDDEN_DOOR.mx, HIDDEN_DOOR.my];
  return (
    <svg className={`iii-map__svg iii-map__svg--${layout}`} viewBox={size} aria-hidden="true">
      <g fill="none" stroke="#0A0A0A" strokeWidth="3" strokeOpacity="0.55">
        {MAP_EDGES.map(([a, b]) => (
          <path key={`${a}-${b}`} d={trace(pt(byId[a], layout), pt(byId[b], layout))} />
        ))}
      </g>
      {/* The active route, drawn in travel order so the dashes flow toward the target. */}
      {route.slice(1).map((id, i) => {
        const from = route[i];
        return (
          <g key={`${from}>${id}`} fill="none">
            <path d={trace(pt(byId[from], layout), pt(byId[id], layout))} stroke="#0A0A0A" strokeWidth="11" />
            <path
              className="iii-dashflow"
              d={trace(pt(byId[from], layout), pt(byId[id], layout))}
              stroke="#BEF04A"
              strokeWidth="6"
              strokeDasharray="10 8"
            />
          </g>
        );
      })}
      {MAP_NODES.map((n) => {
        const [x, y] = pt(n, layout);
        return <circle key={n.id} cx={x} cy={y} r="7" fill="#F5F1E8" stroke="#0A0A0A" strokeWidth="3" />;
      })}
      {/* Faint, unlabeled: part of the HIDDEN IN WYNWOOD secret. */}
      <g opacity="0.5">
        <path d={doorOpening(door[0], door[1] + 10, 0.9)} fill="#C9AEF4" />
        <path d={doorPath(door[0], door[1] + 10, 0.9)} fill="#0A0A0A" />
      </g>
    </svg>
  );
}

const pos = (n: { x: number; y: number; mx: number; my: number }) =>
  ({
    '--x': `${n.x / 10}%`,
    '--y': `${n.y / 6.4}%`,
    '--mx': `${n.mx / 6}%`,
    '--my': `${n.my / 9.6}%`,
  }) as CSSProperties;

export function ConceptFestivalMap() {
  const { afterDark, completed, complete, log } = useQuestState();
  const [selected, setSelected] = useState('redbull');
  const [doorNote, setDoorNote] = useState<'new' | 'again' | null>(null);
  const route = useMemo(() => routeTo(selected), [selected]);
  const node = byId[selected];
  const miles = Math.max(0.1, routeLength(route) * 0.00022);
  const doorFound = completed.has('hidden-in-wynwood');

  const labelFor = (n: MapNode) => (n.id === 'playboy' && !afterDark ? '???' : n.label);
  const stopName = node.kind === 'sponsor' && (node.id !== 'playboy' || afterDark) ? `${labelFor(node)} ACTIVATION` : labelFor(node);

  function pick(id: string) {
    setSelected(id);
    setDoorNote(null);
    log('map_node', id);
  }

  function findDoor() {
    setDoorNote(doorFound ? 'again' : 'new');
    complete('hidden-in-wynwood', 300, 'HIDDEN IN WYNWOOD', 'secret-finder');
  }

  return (
    <section id="map" className="iii-section iii-mapsec" aria-labelledby="iii-map-title">
      <div className="iii-wrap">
        <SectionHead
          kicker="CONCEPT FESTIVAL MAP"
          title={
            <span id="iii-map-title">
              WHERE SHOULD I
              <br />
              EXPLORE NEXT?
            </span>
          }
        >
          <p>
            Not just navigation — direction. Tap a node to route there from the entrance and see what's waiting.
            <br />
            <span className="iii-footnote">
              Abstract concept layout. Does not represent the actual III Points festival grounds.
            </span>
          </p>
        </SectionHead>

        <div className="iii-map">
          <div className="iii-map__board">
            <span className="iii-map__stamp">CONCEPT FESTIVAL MAP · NOT TO SCALE</span>
            <MapTraces layout="wide" route={route} />
            <MapTraces layout="tall" route={route} />

            {MAP_NODES.map((n) => (
              <button
                key={n.id}
                type="button"
                style={pos(n)}
                className={cn(
                  'iii-node',
                  `iii-node--${n.kind}`,
                  selected === n.id && 'is-selected',
                  n.id === 'playboy' && !afterDark && 'is-locked',
                )}
                aria-pressed={selected === n.id}
                onClick={() => pick(n.id)}
              >
                {labelFor(n)}
              </button>
            ))}

            <button
              type="button"
              style={pos(HIDDEN_DOOR)}
              className={cn('iii-hiddendoor', doorFound && 'is-found')}
              aria-label={doorFound ? 'Hidden door — found' : 'A faint doorway'}
              onClick={findDoor}
            />
          </div>

          <aside className="iii-map__panel" aria-live="polite">
            {doorNote ? (
              <>
                <p className="iii-panel__label">SECRET FOUND</p>
                <p className="iii-panel__big">HIDDEN DOOR FOUND.</p>
                <p className="iii-panel__line">
                  {doorNote === 'new' ? 'HIDDEN IN WYNWOOD — complete.' : 'You already found this one. Keep exploring.'}
                </p>
                {doorNote === 'new' && <p className="iii-panel__xp">+300 XP</p>}
              </>
            ) : (
              <>
                <div className="iii-panel__row">
                  <p className="iii-panel__label">CURRENT QUEST</p>
                  <p className="iii-panel__big">
                    {node.id === 'playboy' && !afterDark ? 'LOCKED UNTIL 10PM' : node.quest ?? 'FREE ROAM'}
                  </p>
                </div>
                <div className="iii-panel__row">
                  <p className="iii-panel__label">{selected === 'you' ? 'YOU ARE' : 'NEXT STOP'}</p>
                  <p className="iii-panel__stop">{selected === 'you' ? 'AT THE ENTRANCE' : stopName}</p>
                </div>
                <p className="iii-panel__line">{node.id === 'playboy' && !afterDark ? 'Something opens here after dark.' : node.blurb}</p>
                <div className="iii-panel__stats">
                  {selected !== 'you' && (
                    <span>
                      {miles.toFixed(1)} MI · {Math.max(1, Math.round(miles * 20))} MIN
                    </span>
                  )}
                  {node.xp && <span className="iii-panel__xp">+{node.xp} XP</span>}
                </div>
                {node.questAnchor && (
                  <a className="iii-linkbtn" href={`#${node.questAnchor}`}>
                    VIEW QUEST ↗
                  </a>
                )}
              </>
            )}
          </aside>
        </div>

        <ul className="iii-legend" aria-label="Map legend">
          <li className="is-stage">STAGE / ART</li>
          <li className="is-sponsor">SAMPLE SPONSOR</li>
          <li className="is-service">SERVICES</li>
          <li className="is-secret">SECRET</li>
          <li className="is-portal">PORTAL TO MIAMI</li>
        </ul>
      </div>
    </section>
  );
}
