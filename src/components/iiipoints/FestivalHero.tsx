import { useReducedMotion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useQuestState } from './QuestState';
import { doorOpening, doorPath, sparkPath } from './geometry';

/* Arch-shaped rings: the poster's lineup ovals, redrawn as nested doorways. */
const arch = (x0: number, x1: number, cy = 300, base = 620) =>
  `M${x0} ${base} V${cy} A${(x1 - x0) / 2} ${(x1 - x0) / 2} 0 0 1 ${x1} ${cy} V${base}`;

const OUTER = arch(70, 530);
const INNER = arch(118, 482);
const FIELD = `${arch(143, 457)} Z`;

/** One continuous route: in from the left, over the threshold, through the door to the spark. */
const ROUTE = 'M-20 664 H300 V604 L338 572 L264 536 L326 500 L288 468 L300 446';

const RING_OUTER = 'EXPLORE ✦ DISCOVER ✦ COMPLETE ✦ EARN ✦ UNLOCK ✦ EXPLORE ✦ DISCOVER ✦ COMPLETE ✦ EARN ✦ UNLOCK ✦ ';
const RING_INNER =
  'WINGS AFTER DARK • THE PERFECT POUR • AFTER HOURS ACCESS • HIDDEN IN WYNWOOD • 3 STAGES 3 WORLDS • FIND YOUR NEXT SOUND • ';

function HeroDoorway() {
  const reduce = useReducedMotion();
  return (
    <svg className="iii-hero__art" viewBox="0 0 600 700" role="img" aria-labelledby="iii-door-title">
      <title id="iii-door-title">
        A sidequests doorway inside festival rings, with a glowing path travelling through it
      </title>
      <defs>
        <path id="iii-ring-outer" d={OUTER} />
        <path id="iii-ring-inner" d={INNER} />
        <pattern id="iii-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill="#0A0A0A" opacity="0.28" />
        </pattern>
      </defs>

      {/* Rings */}
      <path d={OUTER} fill="none" stroke="#0A0A0A" strokeWidth="50" />
      <path d={OUTER} fill="none" stroke="#A8E4EE" strokeWidth="43" />
      <path d={INNER} fill="none" stroke="#0A0A0A" strokeWidth="50" />
      <path d={INNER} fill="none" stroke="#EF5967" strokeWidth="43" />
      <path d={FIELD} fill="#F5E95D" stroke="#0A0A0A" strokeWidth="3" />
      <path d={FIELD} fill="url(#iii-dots)" />

      <text className="iii-ring-text">
        <textPath href="#iii-ring-outer" startOffset="0">
          {RING_OUTER}
          {!reduce && <animate attributeName="startOffset" from="0" to="-640" dur="40s" repeatCount="indefinite" />}
        </textPath>
      </text>
      <text className="iii-ring-text">
        <textPath href="#iii-ring-inner" startOffset="0">
          {RING_INNER}
        </textPath>
      </text>

      {/* Circuit ticks inside the field */}
      <g stroke="#0A0A0A" strokeWidth="3" fill="none" strokeLinecap="square">
        <path d="M160 360 H206 V400" />
        <circle cx="206" cy="406" r="6" fill="#F5F1E8" />
        <path d="M440 330 H396 V370" />
        <circle cx="396" cy="376" r="6" fill="#BEF04A" />
        <path d="M170 520 H200" />
        <path d="M200 510 V530 M208 510 V530" />
        <path d="M208 520 H226" />
      </g>

      {/* The doorway */}
      <path d={doorOpening(300, 604, 5.6)} fill="#A8E4EE" />
      <path d={doorOpening(300, 604, 5.6)} fill="url(#iii-dots)" />
      <path d={doorPath(300, 604, 5.6)} fill="#0A0A0A" />

      {/* Threshold */}
      <rect x="20" y="604" width="560" height="8" fill="#0A0A0A" />

      {/* The path through the door */}
      <path d={ROUTE} fill="none" stroke="#0A0A0A" strokeWidth="18" strokeLinejoin="round" strokeLinecap="round" />
      <path
        className="iii-route-flow"
        d={ROUTE}
        fill="none"
        stroke="#BEF04A"
        strokeWidth="9"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path className="iii-spark" d={sparkPath(300, 420, 20)} fill="#BEF04A" stroke="#0A0A0A" strokeWidth="3" />

      {!reduce && (
        <circle r="7" fill="#F5F1E8" stroke="#0A0A0A" strokeWidth="3">
          <animateMotion dur="5s" repeatCount="indefinite" path={ROUTE} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
        </circle>
      )}
    </svg>
  );
}

/** Decorative circuit traces behind the hero. */
function CircuitField() {
  return (
    <svg className="iii-hero__field" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="none" stroke="#0A0A0A" strokeWidth="2.5" className="iii-draw-group">
        <path pathLength={1} d="M0 100 H180 V60 H420" />
        <path pathLength={1} d="M0 720 H120 V820 H380 V900" />
        <path pathLength={1} d="M1440 110 H1260 V210 H1120" />
        <path pathLength={1} d="M1440 780 H1300 V680 H1180 V600" />
        <path pathLength={1} d="M620 0 V40 H760" />
        <path pathLength={1} d="M880 900 V830 H1040 V760" />
        <path pathLength={1} d="M0 860 H60 V780" />
      </g>
      <g fill="#F5F1E8" stroke="#0A0A0A" strokeWidth="2.5">
        <circle cx="420" cy="60" r="7" />
        <circle cx="1120" cy="210" r="7" />
        <circle cx="1180" cy="600" r="7" />
        <circle cx="760" cy="40" r="7" />
        <circle cx="60" cy="780" r="7" />
        <circle cx="1040" cy="760" r="7" fill="#BEF04A" />
      </g>
      {/* resistor */}
      <path d="M260 60 l8 -12 l12 24 l12 -24 l12 24 l8 -12" fill="none" stroke="#0A0A0A" strokeWidth="2.5" />
      {/* capacitor */}
      <path d="M1300 772 v16 M1310 772 v16" stroke="#0A0A0A" strokeWidth="3" />
      {/* diode */}
      <path d="M200 820 l-14 -9 v18 z M202 811 v18" fill="#0A0A0A" stroke="#0A0A0A" strokeWidth="2" />
      {/* sparks */}
      <path d={sparkPath(1360, 420, 14)} fill="#0A0A0A" />
      <path d={sparkPath(80, 300, 10)} fill="#0A0A0A" />
      <path d={sparkPath(980, 70, 10)} fill="#F28B35" stroke="#0A0A0A" strokeWidth="2" />
    </svg>
  );
}

/** Easter egg: an odd circuit glyph that pays out a tiny secret quest. */
function StrangeGlyph() {
  const { complete, completed } = useQuestState();
  const found = completed.has('strange-glyph');
  return (
    <button
      type="button"
      className={`iii-glyph ${found ? 'is-found' : ''}`}
      aria-label={found ? 'Secret quest discovered' : 'A strange circuit symbol'}
      onClick={() => complete('strange-glyph', 50, 'SECRET QUEST DISCOVERED', 'secret-finder')}
    >
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 3" />
        <path d="M13 20 H18 M22 14 V26 M18 14 L22 20 L18 26 Z M22 20 H27" stroke="currentColor" strokeWidth="2.5" fill="none" />
      </svg>
      {found && <span className="iii-glyph__tip">SECRET QUEST DISCOVERED · +50 XP</span>}
    </button>
  );
}

export function FestivalHero() {
  return (
    <section id="top" className="iii-hero" aria-labelledby="iii-hero-title">
      <CircuitField />
      <StrangeGlyph />
      <div className="iii-hero__inner">
        <div className="iii-hero__copy">
          <p className="iii-eyebrow">
            <span className="iii-eyebrow__main">SIDEQUESTS × III POINTS</span>
            <span className="iii-eyebrow__sub">CONCEPT EXPERIENCE</span>
          </p>
          <h1 id="iii-hero-title" className="iii-h1">
            <span>THE FESTIVAL</span>
            <span>
              IS THE <mark>QUEST.</mark>
            </span>
          </h1>
          <ul className="iii-hero__lines">
            <li>Explore III Points.</li>
            <li>Complete challenges.</li>
            <li>Discover hidden experiences.</li>
            <li>Earn XP.</li>
            <li>Unlock Miami.</li>
          </ul>
          <dl className="iii-hero__facts">
            <div className="is-lime">
              <dt>CITY</dt>
              <dd>MIAMI</dd>
            </div>
            <div className="is-orange">
              <dt>DATES</dt>
              <dd>OCTOBER 16–17</dd>
            </div>
            <div className="is-ink">
              <dt>HOURS</dt>
              <dd>4PM → 4AM</dd>
            </div>
          </dl>
          <div className="iii-hero__ctas">
            <a href="#quests" className="iii-btn iii-btn--lime iii-btn--lg">
              START THE QUEST
            </a>
            <a href="#how" className="iii-btn iii-btn--ghost iii-btn--lg">
              SEE HOW IT WORKS
            </a>
          </div>
        </div>
        <div className="iii-hero__visual">
          <HeroDoorway />
        </div>
      </div>
      <a href="#how" className="iii-hero__enter">
        ENTER THE FESTIVAL <ArrowDown aria-hidden="true" size={16} />
      </a>
    </section>
  );
}

/** The "gate" band between the hero and the festival: scrolling = walking in. */
export function GateBand() {
  const items = ['NOW ENTERING', 'III POINTS', 'MIAMI', 'OCT 16–17', 'EVERY PATH LEADS SOMEWHERE', 'CONCEPT EXPERIENCE'];
  return (
    <div className="iii-gate" aria-hidden="true">
      <div className="iii-gate__track">
        {[0, 1, 2].map((copy) =>
          items.map((t) => (
            <span key={`${copy}-${t}`}>
              {t} <b>✦</b>
            </span>
          )),
        )}
      </div>
    </div>
  );
}
