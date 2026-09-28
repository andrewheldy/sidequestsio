import { useEffect, useState } from 'react';
import { MIAMI_QUESTS } from './data';
import { QuestCard } from './QuestCard';
import { useQuestState } from './QuestState';
import { doorPath, sparkPath } from './geometry';
import { Reveal } from './shared';

const HOODS = [
  { name: 'WYNWOOD', x: 560, y: 80 },
  { name: 'LITTLE RIVER', x: 700, y: 170 },
  { name: 'DESIGN DISTRICT', x: 560, y: 260 },
  { name: 'MIAMI BEACH', x: 760, y: 320 },
];

/** Festival paths leaving the gates and fanning out into Miami. */
function Expansion() {
  return (
    <svg className="iii-expand" viewBox="0 0 1000 400" role="img" aria-labelledby="iii-expand-title">
      <title id="iii-expand-title">Quest paths leave the festival and spread to Wynwood, Little River, the Design District and Miami Beach</title>
      {/* the festival, as a small arch */}
      <path d="M40 330 V210 A100 100 0 0 1 240 210 V330 Z" fill="#C9AEF4" stroke="#0A0A0A" strokeWidth="4" />
      <path d={doorPath(140, 330, 3)} fill="#0A0A0A" />
      <text x="140" y="368" textAnchor="middle" className="iii-expand__label">
        III POINTS
      </text>
      <g className="iii-draw-group" fill="none" stroke="#0A0A0A" strokeWidth="4" strokeLinejoin="round">
        {HOODS.map((h, i) => (
          <path
            key={h.name}
            pathLength={1}
            style={{ ['--i' as string]: i }}
            d={`M240 ${250 + i * 18} H${340 + i * 30} V${h.y} H${h.x}`}
          />
        ))}
      </g>
      {HOODS.map((h) => (
        <g key={h.name}>
          <circle cx={h.x} cy={h.y} r="12" fill="#BEF04A" stroke="#0A0A0A" strokeWidth="4" />
          <text x={h.x + 22} y={h.y + 8} className="iii-expand__hood">
            {h.name}
          </text>
        </g>
      ))}
      <path d={sparkPath(950, 60, 18)} fill="#F28B35" stroke="#0A0A0A" strokeWidth="3" />
    </svg>
  );
}

/** Fictional countdown to "tomorrow" in Wynwood. */
function useCountdown(startSeconds: number) {
  const [left, setLeft] = useState(startSeconds);
  useEffect(() => {
    const t = window.setInterval(() => setLeft((s) => (s > 0 ? s - 1 : startSeconds)), 1000);
    return () => window.clearInterval(t);
  }, [startSeconds]);
  const hh = String(Math.floor(left / 3600)).padStart(2, '0');
  const mm = String(Math.floor((left % 3600) / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function MiamiContinuation() {
  const { totalXP } = useQuestState();
  const countdown = useCountdown(13 * 3600 + 42 * 60 + 7);

  return (
    <section id="miami" className="iii-miami" aria-labelledby="iii-miami-title">
      {/* 4AM → sunrise: the poster's bands, stacked like a Miami morning. */}
      <div className="iii-sunrise" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <p>4:00 AM · LIGHTS UP · THE GATES CLOSE</p>
      </div>

      <div className="iii-section iii-miami__body">
        <div className="iii-wrap">
          <h2 id="iii-miami-title" className="iii-miami__title">
            <span>THE FESTIVAL ENDS.</span>
            <mark>THE QUEST DOESN'T.</mark>
          </h2>
          <div className="iii-miami__lede">
            <p>III Points brings people into Miami.</p>
            <p>
              <strong>sidequests gives them a reason to keep exploring it.</strong>
            </p>
          </div>

          <Reveal className="iii-miami__map">
            <Expansion />
          </Reveal>

          <div className="iii-miami__grid">
            <div className="iii-carry">
              <p className="iii-carry__kicker">✓ III POINTS COMPLETE</p>
              <p className="iii-carry__xp">
                {totalXP.toLocaleString('en-US')} <span>XP EARNED</span>
              </p>
              <p className="iii-carry__label">NEW QUESTS UNLOCKED</p>
              <ul className="iii-carry__list">
                {HOODS.map((h) => (
                  <li key={h.name}>→ {h.name}</li>
                ))}
              </ul>
            </div>

            <article className="iii-continue" aria-labelledby="iii-continue-title">
              <p className="iii-scard__stamp">CONCEPT SPONSOR CONTINUATION</p>
              <p className="iii-continue__chapter">WINGS AFTER DARK · CHAPTER 01</p>
              <p id="iii-continue-title" className="iii-continue__done">
                QUEST COMPLETE.
              </p>
              <p className="iii-continue__next">
                YOUR NEXT QUEST
                <br />
                UNLOCKS IN <mark>WYNWOOD</mark>
                <br />
                TOMORROW.
              </p>
              <ol className="iii-continue__chain" aria-label="Campaign chapters">
                <li className="is-done">01 · FESTIVAL</li>
                <li className="is-next">02 · WYNWOOD</li>
                <li>03 · ???</li>
              </ol>
              <p className="iii-continue__timer">
                CHAPTER 02 UNLOCKS IN <b>{countdown}</b>
              </p>
              <p className="iii-footnote iii-footnote--paper">
                How a sponsor relationship could extend beyond the festival gates. Sample only.
              </p>
            </article>
          </div>

          <p className="iii-kicker iii-miami__kicker">
            <span className="iii-kicker__node" aria-hidden="true" />
            POST-FESTIVAL SIDEQUESTS · SAMPLE
          </p>
          <div className="iii-miami__quests">
            {MIAMI_QUESTS.map((q) => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
