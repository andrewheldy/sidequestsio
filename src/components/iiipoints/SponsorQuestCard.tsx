import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BADGES, PLAYBOY_CLUE, SponsorQuest } from './data';
import { useQuestState } from './QuestState';
import { sparkPath } from './geometry';

const GLYPHS = '?#%&@$*/<>';

/** Obscures text as glyph noise, then decodes it left→right once `revealed`. */
function useScramble(text: string, revealed: boolean) {
  const reduce = useReducedMotion();
  const [out, setOut] = useState(() => text.replace(/\S/g, '?'));
  useEffect(() => {
    if (!revealed) {
      setOut(text.replace(/\S/g, '?'));
      return;
    }
    if (reduce) {
      setOut(text);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      const cut = Math.floor(text.length * t);
      setOut(
        text.slice(0, cut) +
          text
            .slice(cut)
            .replace(/\S/g, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]),
      );
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, revealed, reduce]);
  return out;
}

/* ─── Per-sponsor visuals ─────────────────────────────────────────────── */

const RB_POINTS: [number, number][] = [
  [30, 90],
  [120, 30],
  [210, 88],
  [300, 32],
];
const RB_LABELS = ['START', '01', '02', '03'];

function RedBullRoute({ done, active }: { done: number; active: boolean }) {
  return (
    <svg className="iii-rbroute" viewBox="0 0 330 134" aria-hidden="true">
      {RB_POINTS.slice(1).map(([x, y], i) => {
        const [px, py] = RB_POINTS[i];
        const d = `M${px} ${py} H${(px + x) / 2} V${y} H${x}`;
        const lit = i < done;
        const next = active && i === done;
        return (
          <g key={x}>
            <path d={d} fill="none" stroke="#F5F1E8" strokeOpacity="0.25" strokeWidth="6" />
            <path
              d={d}
              fill="none"
              className={cn(next && 'iii-dashflow')}
              stroke={lit ? '#BEF04A' : next ? '#EF5967' : 'transparent'}
              strokeWidth={lit ? 6 : 4}
              strokeDasharray={next ? '8 8' : undefined}
            />
          </g>
        );
      })}
      {RB_POINTS.map(([x, y], i) => {
        const lit = i === 0 ? active || done > 0 : i <= done;
        return (
          <g key={x}>
            <circle cx={x} cy={y} r="13" fill={lit ? '#BEF04A' : '#0A0A0A'} stroke="#F5F1E8" strokeWidth="3" />
            <text x={x} y={y + 32} textAnchor="middle" className="iii-rbroute__label">
              {RB_LABELS[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StellaGlass({ level }: { level: number }) {
  // Chalice bowl, stem and foot. The pour rises with each objective.
  const bowl = 'M40 12 H120 C120 70 104 96 80 100 C56 96 40 70 40 12 Z';
  const fillTop = 100 - level * 86;
  return (
    <svg className="iii-glass" viewBox="0 0 160 150" aria-hidden="true">
      <defs>
        <clipPath id="iii-bowl">
          <path d={bowl} />
        </clipPath>
      </defs>
      <rect className="iii-glass__pour" x="30" y={fillTop} width="100" height="100" fill="#F5E95D" clipPath="url(#iii-bowl)" />
      {level > 0 && (
        <rect x="30" y={fillTop - 8} width="100" height="10" fill="#F5F1E8" clipPath="url(#iii-bowl)" opacity="0.9" />
      )}
      <path d={bowl} fill="none" stroke="#0A0A0A" strokeWidth="3" />
      <path d="M80 100 V132 M56 136 H104" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" />
      <path d={sparkPath(80, 48, 12)} fill="#EF5967" opacity={level >= 1 ? 1 : 0.35} />
    </svg>
  );
}

function Keyhole({ open }: { open: boolean }) {
  return (
    <svg className={cn('iii-keyhole', open && 'is-open')} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="54" fill="none" stroke="#C9AEF4" strokeWidth="3" strokeDasharray="6 6" />
      <circle cx="60" cy="48" r="16" fill={open ? '#BEF04A' : '#C9AEF4'} />
      <path d="M52 56 L46 88 H74 L68 56 Z" fill={open ? '#BEF04A' : '#C9AEF4'} />
    </svg>
  );
}

/* ─── Card ────────────────────────────────────────────────────────────── */

function blocks(done: number, total: number, width = 12) {
  const filled = Math.round((done / total) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function formatClock(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const UNLOCK_AT = 22 * 60; // 10:00 PM

export function SponsorQuestCard({ quest }: { quest: SponsorQuest }) {
  const { completed, complete, afterDark, setAfterDark, log } = useQuestState();
  const reduce = useReducedMotion();
  const secret = quest.variant === 'playboy';
  const done = completed.has(quest.id);
  const [accepted, setAccepted] = useState(false);
  // For the secret quest, objective 01 ("unlock after the evening time") is met by unlocking.
  const [step, setStep] = useState(0);
  const [clock, setClock] = useState(21 * 60 + 52);
  const [clueMiss, setClueMiss] = useState<string | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearInterval(timer.current), []);

  const locked = secret && !afterDark;
  const status = done ? 'complete' : accepted ? 'active' : locked ? 'locked' : 'idle';
  const progress = done ? quest.objectives.length : step;
  const badge = BADGES.find((b) => b.id === quest.badge);

  const copyLine = useScramble(quest.copy.join(' '), !secret || afterDark);

  function start() {
    setAccepted(true);
    if (secret) setStep(1);
    log('sponsor_quest_start', quest.id);
  }

  function advance() {
    const next = step + 1;
    setStep(next);
    if (next >= quest.objectives.length) complete(quest.id, quest.xp, quest.title, quest.badge);
  }

  function skipToTen() {
    log('after_dark_skip', quest.id);
    if (reduce) {
      setClock(UNLOCK_AT);
      setAfterDark();
      return;
    }
    window.clearInterval(timer.current);
    let now = clock;
    timer.current = window.setInterval(() => {
      now += 1;
      setClock(now);
      if (now >= UNLOCK_AT) {
        window.clearInterval(timer.current);
        setAfterDark();
      }
    }, 110);
  }

  function answer(option: string) {
    if (option === PLAYBOY_CLUE.answer) {
      setClueMiss(null);
      advance();
    } else {
      setClueMiss(option);
    }
  }

  const onClueStep = secret && status === 'active' && step === 1;

  return (
    <article
      id={`sponsor-${quest.id}`}
      className={cn('iii-scard', `iii-scard--${quest.variant}`, `is-${status}`)}
      aria-labelledby={`sponsor-${quest.id}-title`}
    >
      <p className="iii-scard__stamp">CONCEPT SPONSOR QUEST</p>

      <header className="iii-scard__head">
        <p className="iii-scard__sponsor">
          <span className="iii-sr">Sample sponsor: </span>
          {quest.sponsor}
        </p>
        <p className="iii-scard__meta">{secret && afterDark ? 'UNLOCKED · AFTER 10PM' : quest.meta}</p>
      </header>

      <div className="iii-scard__visual">
        {quest.variant === 'redbull' && <RedBullRoute done={progress} active={status !== 'idle'} />}
        {quest.variant === 'stella' && <StellaGlass level={progress / quest.objectives.length} />}
        {quest.variant === 'playboy' && (
          <div className="iii-pb">
            <Keyhole open={afterDark} />
            <div className="iii-pb__clock">
              <span>FESTIVAL TIME</span>
              <b>{formatClock(clock)}</b>
              {locked && (
                <button type="button" className="iii-linkbtn" onClick={skipToTen}>
                  ▸ DEMO: SKIP TO 10PM
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {secret && <p className="iii-scard__kicker">SECRET QUEST</p>}
      <h3 id={`sponsor-${quest.id}-title`} className="iii-scard__title">
        {quest.title}
      </h3>

      {locked ? (
        <div className="iii-scard__copy">
          <p className="iii-obscured-line">
            <span className="iii-sr">Quest details are hidden until after dark.</span>
            <span aria-hidden="true">??????????????</span>
          </p>
          <p className="iii-scard__whisper">UNLOCKS AFTER DARK</p>
        </div>
      ) : (
        <div className="iii-scard__copy">
          {secret ? (
            <p>
              <span className="iii-sr">{quest.copy.join(' ')}</span>
              <span aria-hidden="true">{copyLine}</span>
            </p>
          ) : (
            quest.copy.map((c) => <p key={c}>{c}</p>)
          )}
        </div>
      )}

      <ol className="iii-objectives" aria-label="Objectives">
        {quest.objectives.map((o, i) => (
          <li key={o} className={cn(i < progress && 'is-done', status === 'active' && i === progress && 'is-next')}>
            <span className="iii-objectives__num">{i < progress ? '✓' : `0${i + 1}`}</span>
            <span className={cn(locked && 'iii-obscured')}>{o}</span>
          </li>
        ))}
      </ol>

      {onClueStep && (
        <div className="iii-clue" role="group" aria-labelledby={`clue-${quest.id}`}>
          <p id={`clue-${quest.id}`} className="iii-clue__riddle">
            “{PLAYBOY_CLUE.riddle}”
          </p>
          <div className="iii-clue__options">
            {PLAYBOY_CLUE.options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={cn('iii-chip iii-chip--dark', clueMiss === opt && 'is-miss')}
                onClick={() => answer(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <p className="iii-clue__feedback" aria-live="polite">
            {clueMiss ? `${clueMiss}? COLD. TRY AGAIN.` : ''}
          </p>
        </div>
      )}

      <dl className="iii-reward">
        <div>
          <dt>REWARD</dt>
          <dd className="iii-reward__xp">+{quest.xp} XP</dd>
        </div>
        <div>
          <dt>BADGE</dt>
          <dd>{badge?.name}</dd>
        </div>
        <div className="iii-reward__wide">
          <dt>CONCEPTUAL REWARD</dt>
          <dd>{quest.conceptReward}</dd>
        </div>
      </dl>

      <ul className="iii-scard__tags" aria-label="Quest type">
        {quest.tags.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <div className="iii-scard__action">
        {status === 'locked' && (
          <button type="button" className="iii-btn iii-btn--block iii-btn--locked" disabled>
            🔒 LOCKED UNTIL 10PM
          </button>
        )}
        {status === 'idle' && (
          <button type="button" className="iii-btn iii-btn--block iii-btn--sponsor" onClick={start}>
            {quest.cta}
          </button>
        )}
        {status === 'active' && (
          <>
            <p className="iii-scard__progress" aria-live="polite">
              <span>{quest.title}</span>
              <span>
                {progress} / {quest.objectives.length} COMPLETE
              </span>
              <span className="iii-blocks" aria-hidden="true">
                {blocks(progress, quest.objectives.length)}
              </span>
            </p>
            {!onClueStep && (
              <button type="button" className="iii-btn iii-btn--block iii-btn--sponsor" onClick={advance}>
                {secret && step === 2 ? 'SCAN AT HIDDEN LOCATION' : `CHECK IN · 0${step + 1}`}
              </button>
            )}
          </>
        )}
        {status === 'complete' && (
          <div className="iii-scard__done">
            <p className="iii-scard__donetitle">{quest.completeTitle}</p>
            <p className="iii-scard__donexp">+{quest.xp} XP</p>
            <p className="iii-scard__donebadge">BADGE EARNED · {badge?.name}</p>
          </div>
        )}
      </div>
    </article>
  );
}
