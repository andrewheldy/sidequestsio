/**
 * Original artwork for the /vice campaign, drawn as inline SVG.
 *
 * Authored for this page (see ASSETS.md). Nothing here is traced from, or
 * meant to resemble, any third party's artwork, characters or lettering.
 * Inline vectors keep the hero free of image requests and layout shift.
 */
import { useId } from 'react';

const C = {
  coral: '#FF6B65',
  pink: '#FF3E91',
  orange: '#FF9B45',
  violet: '#341B58',
  navy: '#10152B',
  cyan: '#46E8E8',
  cream: '#FFF1DE',
  ink: '#0A0D1C',
};

/** One drooping palm frond from the crown at (0,0) to (dx,dy). */
function frond(dx: number, dy: number) {
  const lift = Math.abs(dx) * 0.45 + 14;
  return `M0 0 Q${dx * 0.45} ${dy * 0.3 - lift} ${dx} ${dy} Q${dx * 0.5} ${dy * 0.35 - lift * 0.45} 0 0Z`;
}

const FRONDS: [number, number][] = [
  [-92, 34], [-74, -8], [-44, -44], [-6, -62], [36, -50], [72, -16], [94, 30], [-58, 62], [60, 60],
];

/** Palm silhouette. The crown sits at (x, y); the trunk drops `height` and leans by `lean`. */
export function Palm({ x, y, height, lean = 0, scale = 1, fill = C.ink }: { x: number; y: number; height: number; lean?: number; scale?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill}>
      <path d={`M-5 0 Q${lean * 0.2} ${height * 0.5} ${lean - 9} ${height} L${lean + 9} ${height} Q${lean * 0.2 + 12} ${height * 0.5} 5 0Z`} />
      {FRONDS.map(([dx, dy]) => (
        <path key={`${dx}:${dy}`} d={frond(dx, dy)} />
      ))}
      <circle r="9" />
    </g>
  );
}

/** [x, width, height] towers along a 1440-wide baseline. */
const TOWERS: [number, number, number][] = [
  [0, 70, 90], [64, 52, 150], [120, 84, 110], [210, 46, 210], [262, 70, 160], [338, 40, 250], [384, 96, 130],
  [486, 58, 300], [550, 44, 220], [600, 88, 170], [694, 50, 340], [750, 76, 240], [832, 42, 190], [880, 92, 140],
  [978, 56, 270], [1040, 70, 180], [1116, 44, 230], [1166, 90, 120], [1262, 52, 200], [1320, 64, 150], [1388, 60, 100],
];

function skylinePath(baseline: number, scale = 1) {
  return TOWERS.map(([x, w, h]) => `M${x} ${baseline}V${baseline - h * scale}h${w}V${baseline}Z`).join('');
}

/** Hero skyline strip: far and near towers over a waterline. Sits at the bottom of the hero. */
export function HeroSkyline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <path d={skylinePath(330, 0.62)} fill={C.violet} opacity="0.75" transform="translate(36 0)" />
      <path d={skylinePath(330)} fill={C.navy} />
      {TOWERS.filter((_, i) => i % 2 === 1).map(([x, w, h]) => (
        <g key={x} fill={C.orange} opacity="0.5">
          {Array.from({ length: Math.min(4, Math.floor(h / 60)) }, (_, row) => (
            <rect key={row} x={x + 10} y={330 - h + 22 + row * 44} width={Math.max(6, w - 20)} height="4" />
          ))}
        </g>
      ))}
      <rect y="330" width="1440" height="90" fill={C.navy} />
      {[0, 1, 2, 3, 4].map((row) => (
        <rect key={row} x={520 - row * 46} y={342 + row * 15} width={400 + row * 92} height="3" rx="1.5" fill={C.coral} opacity={0.55 - row * 0.09} />
      ))}
    </svg>
  );
}

/** Hero foreground palms, one cluster per side. */
export function HeroPalms({ side, className }: { side: 'left' | 'right'; className?: string }) {
  const flip = side === 'right' ? 'translate(360 0) scale(-1 1)' : undefined;
  return (
    <svg className={className} viewBox="0 0 360 640" preserveAspectRatio={side === 'left' ? 'xMinYMax meet' : 'xMaxYMax meet'} aria-hidden="true" focusable="false">
      <g transform={flip}>
        <Palm x={118} y={150} height={500} lean={-46} scale={1.25} />
        <Palm x={236} y={300} height={350} lean={30} scale={0.9} />
        <Palm x={40} y={380} height={270} lean={-10} scale={0.7} />
      </g>
    </svg>
  );
}

/* ─── Mission scenes (400×300) ─────────────────────────────────────────── */

function NeonScene({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.ink} />
          <stop offset="0.7" stopColor={C.violet} />
          <stop offset="1" stopColor="#7A2A78" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${uid}-sky)`} />
      <circle cx="318" cy="58" r="20" fill={C.cream} opacity="0.9" />
      <circle cx="310" cy="52" r="20" fill={C.ink} opacity="0.55" />
      {[[40, 40], [92, 76], [150, 32], [232, 60], [364, 118], [22, 132]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill={C.cream} opacity="0.7" />
      ))}
      {/* Stepped Art Deco front with a central fin and eyebrow ledges. */}
      <g fill="#1B1F3F">
        <rect x="96" y="150" width="208" height="150" />
        <rect x="124" y="118" width="152" height="40" />
        <rect x="156" y="92" width="88" height="34" />
        <rect x="190" y="44" width="20" height="60" />
      </g>
      <g fill="none" strokeLinecap="round" strokeWidth="3">
        <path d="M96 150h208M124 118h152M156 92h88" stroke={C.pink} />
        <path d="M200 44v48" stroke={C.cyan} />
        <path d="M190 104V56M210 104V56" stroke={C.pink} opacity="0.7" />
        <path d="M110 186h180M110 226h180" stroke={C.cyan} opacity="0.85" />
      </g>
      <g fill={C.orange}>
        {[120, 158, 196, 234, 272].map((x) => (
          <rect key={x} x={x} y="196" width="16" height="20" rx="2" opacity="0.9" />
        ))}
        {[120, 158, 234, 272].map((x) => (
          <rect key={x} x={x} y="238" width="16" height="20" rx="2" opacity="0.6" />
        ))}
      </g>
      <rect x="186" y="246" width="28" height="54" rx="14" fill={C.cyan} opacity="0.9" />
      <rect y="284" width="400" height="16" fill={C.ink} />
      <rect x="20" y="290" width="360" height="2" fill={C.pink} opacity="0.5" />
      <Palm x={46} y={150} height={150} lean={-8} scale={0.62} />
      <Palm x={356} y={176} height={124} lean={10} scale={0.52} />
    </>
  );
}

function CanvasScene({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.orange} />
          <stop offset="1" stopColor={C.cream} />
        </linearGradient>
        <clipPath id={`${uid}-wall`}>
          <rect x="24" y="96" width="352" height="164" />
        </clipPath>
      </defs>
      <rect width="400" height="300" fill={`url(#${uid}-sky)`} />
      <circle cx="322" cy="56" r="30" fill={C.cream} opacity="0.85" />
      <rect x="24" y="96" width="352" height="164" fill={C.navy} />
      <g clipPath={`url(#${uid}-wall)`}>
        <circle cx="92" cy="196" r="78" fill={C.pink} />
        <circle cx="92" cy="196" r="46" fill={C.cream} />
        <circle cx="92" cy="196" r="20" fill={C.navy} />
        <path d="M150 260 232 104l82 156Z" fill={C.cyan} />
        <path d="M196 260 232 190l36 70Z" fill={C.violet} />
        <g stroke={C.orange} strokeWidth="13">
          <path d="M290 84 400 194M316 84 400 168M342 84 400 142" />
        </g>
        <g fill={C.coral}>
          <rect x="300" y="204" width="34" height="34" transform="rotate(12 317 221)" />
          <circle cx="354" cy="236" r="13" />
        </g>
        <path d="M24 142q30-26 60 0t60 0 60 0" fill="none" stroke={C.cream} strokeWidth="6" opacity="0.9" />
      </g>
      <rect x="24" y="88" width="352" height="10" fill={C.ink} />
      <rect x="250" y="206" width="30" height="54" fill={C.ink} />
      <rect y="260" width="400" height="40" fill="#2A2140" />
      <rect y="260" width="400" height="5" fill={C.ink} opacity="0.5" />
      <g fill={C.cream} opacity="0.6">
        <rect x="30" y="279" width="46" height="4" />
        <rect x="126" y="279" width="46" height="4" />
        <rect x="222" y="279" width="46" height="4" />
        <rect x="318" y="279" width="46" height="4" />
      </g>
    </>
  );
}

function CalleScene({ uid }: { uid: string }) {
  const fronts: [number, number, number, string, string][] = [
    [0, 108, 150, C.coral, C.cream],
    [108, 96, 180, C.cyan, C.pink],
    [204, 104, 136, C.cream, C.orange],
    [308, 92, 166, C.orange, C.cyan],
  ];
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B2A86" />
          <stop offset="0.6" stopColor={C.pink} />
          <stop offset="1" stopColor={C.orange} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${uid}-sky)`} />
      <circle cx="78" cy="70" r="26" fill={C.cream} opacity="0.9" />
      {fronts.map(([x, w, h, wall, awning]) => {
        const top = 262 - h;
        const stripes = Math.floor(w / 16);
        return (
          <g key={x}>
            <rect x={x} y={top} width={w} height={h} fill={wall} />
            <rect x={x} y={top} width={w} height="9" fill={C.navy} opacity="0.35" />
            {[0.2, 0.62].map((f) => (
              <rect key={f} x={x + w * f} y={top + 24} width={w * 0.2} height="26" rx={w * 0.1} fill={C.navy} opacity="0.75" />
            ))}
            <path d={`M${x + 12} 262v-40a${(w - 24) / 2} ${(w - 24) / 2} 0 0 1 ${w - 24} 0v40Z`} fill={C.navy} opacity="0.82" />
            {Array.from({ length: stripes }, (_, i) => (
              <rect key={i} x={x + i * 16} y={206} width="16" height="16" fill={i % 2 ? awning : C.navy} />
            ))}
          </g>
        );
      })}
      <rect y="262" width="400" height="38" fill={C.violet} />
      <rect y="262" width="400" height="5" fill={C.ink} opacity="0.45" />
      {/* Domino tiles: a nod to the games played along the street. */}
      <g transform="translate(150 244) rotate(-10)">
        <rect width="46" height="24" rx="4" fill={C.cream} />
        <path d="M23 3v18" stroke={C.navy} strokeWidth="2" />
        <g fill={C.navy}>
          <circle cx="8" cy="8" r="2.6" /><circle cx="15" cy="16" r="2.6" /><circle cx="31" cy="7" r="2.6" /><circle cx="35" cy="12" r="2.6" /><circle cx="39" cy="17" r="2.6" />
        </g>
      </g>
      <g transform="translate(206 250) rotate(8)">
        <rect width="46" height="24" rx="4" fill={C.cream} />
        <path d="M23 3v18" stroke={C.navy} strokeWidth="2" />
        <g fill={C.navy}>
          <circle cx="11.5" cy="12" r="2.6" /><circle cx="30" cy="7" r="2.6" /><circle cx="39" cy="7" r="2.6" /><circle cx="30" cy="17" r="2.6" /><circle cx="39" cy="17" r="2.6" />
        </g>
      </g>
      <Palm x={372} y={64} height={200} lean={6} scale={0.5} />
    </>
  );
}

function SkylineScene({ uid }: { uid: string }) {
  const towers: [number, number, number][] = [
    [10, 34, 70], [48, 26, 112], [78, 42, 86], [124, 24, 150], [152, 38, 118], [194, 22, 176], [220, 46, 100],
    [270, 28, 140], [302, 36, 92], [342, 24, 124], [368, 32, 66],
  ];
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.violet} />
          <stop offset="0.5" stopColor={C.pink} />
          <stop offset="0.8" stopColor={C.orange} />
          <stop offset="1" stopColor={C.cream} />
        </linearGradient>
      </defs>
      <rect width="400" height="210" fill={`url(#${uid}-sky)`} />
      <circle cx="200" cy="196" r="62" fill={C.cream} opacity="0.92" />
      <path d="M0 96q60-18 120 0t120-4 160 6v10H0Z" fill={C.cream} opacity="0.16" />
      {towers.map(([x, w, h]) => (
        <g key={x}>
          <rect x={x} y={210 - h} width={w} height={h} fill={C.navy} />
          {Array.from({ length: Math.floor(h / 22) }, (_, row) => (
            <rect key={row} x={x + 5} y={210 - h + 10 + row * 20} width={w - 10} height="2.5" fill={C.orange} opacity="0.7" />
          ))}
        </g>
      ))}
      <rect y="210" width="400" height="90" fill={C.navy} />
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <rect key={row} x={150 - row * 16} y={220 + row * 13} width={100 + row * 32} height="3.5" rx="1.75" fill={row % 2 ? C.pink : C.orange} opacity={0.8 - row * 0.11} />
      ))}
      <path d="M0 300v-26q40-10 86 2l-10 24Z" fill={C.ink} />
      <Palm x={34} y={176} height={110} lean={-6} scale={0.46} />
    </>
  );
}

function CircuitScene({ uid }: { uid: string }) {
  const stops: [number, number, string][] = [
    [302, 132, C.pink], [152, 78, C.cyan], [92, 196, C.orange], [196, 164, C.coral],
  ];
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sea`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.navy} />
          <stop offset="1" stopColor={C.violet} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${uid}-sea)`} />
      {/* Mainland and barrier island, heavily simplified. */}
      <path d="M0 0h250q-18 60 2 110t-22 96 6 94H0Z" fill="#1D2347" />
      <path d="M286 0h44q20 90 6 170t-34 130h-30q30-80 34-150T286 0Z" fill="#1D2347" />
      <g stroke={C.cream} strokeWidth="1" opacity="0.14">
        {[40, 80, 120, 160, 200].map((x) => (
          <path key={x} d={`M${x} 0V300`} />
        ))}
        {[50, 100, 150, 200, 250].map((y) => (
          <path key={y} d={`M0 ${y}H240`} />
        ))}
      </g>
      <path d="M302 132 196 164 152 78 92 196 196 164" fill="none" stroke={C.cyan} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
      <path d="M302 132 196 164 152 78 92 196 196 164" fill="none" stroke={C.cyan} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 9" />
      {stops.map(([x, y, color], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="17" fill={color} opacity="0.25" />
          <circle cx={x} cy={y} r="9" fill={color} />
          <circle cx={x} cy={y} r="3.5" fill={C.navy} />
        </g>
      ))}
      <g fill="none" stroke={C.cream} strokeWidth="2" opacity="0.7">
        <circle cx="352" cy="252" r="20" />
        <path d="M352 238v28M338 252h28" />
      </g>
      <path d="m352 228 5 12h-10Z" fill={C.cream} opacity="0.9" />
    </>
  );
}

const SCENES: Record<string, (props: { uid: string }) => JSX.Element> = {
  neon: NeonScene,
  canvas: CanvasScene,
  calle: CalleScene,
  skyline: SkylineScene,
  circuit: CircuitScene,
};

/** A mission illustration. Reserve its 4:3 box in CSS so nothing shifts. */
export function MissionArt({ art, alt, className }: { art: string; alt: string; className?: string }) {
  const uid = `va${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const Scene = SCENES[art] ?? SCENES.circuit;
  return (
    <svg className={className} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label={alt} focusable="false">
      <Scene uid={uid} />
    </svg>
  );
}
