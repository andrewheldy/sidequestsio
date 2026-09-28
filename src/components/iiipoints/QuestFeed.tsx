import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FESTIVAL_QUESTS, QuestKind } from './data';
import { QuestCard } from './QuestCard';
import { useQuestState } from './QuestState';
import { Reveal, SectionHead } from './shared';

const STEPS = [
  { verb: 'EXPLORE', line: 'Paths across stages, art, food and activations — with a reason to take each one.' },
  { verb: 'DISCOVER', line: 'Quests reveal themselves by place and time. Some only appear after dark.' },
  { verb: 'COMPLETE', line: 'Scan the QR on site. Presence is verified, not just claimed.' },
  { verb: 'EARN', line: 'XP for progression. Points for rewards. Badges for the story.' },
  { verb: 'UNLOCK', line: 'Perks, secret experiences — and quests across Miami after the gates close.' },
];

export function HowItWorks() {
  return (
    <section id="how" className="iii-section iii-how" aria-labelledby="iii-how-title">
      <div className="iii-wrap">
        <SectionHead
          kicker="THE CORE CONCEPT"
          title={
            <span id="iii-how-title">
              III POINTS BUILDS THE WORLD.
              <br />
              <em>SIDEQUESTS MAKES IT PLAYABLE.</em>
            </span>
          }
        >
          <p>
            Music, art, stages, food, brands, installations, the unexpected. It is already there. sidequests adds a
            playable digital layer on top — so attendees don't just walk the festival. They explore it.
          </p>
        </SectionHead>
        <Reveal as="ol" className="iii-how__steps">
          {STEPS.map((s, i) => (
            <li key={s.verb} style={{ ['--i' as string]: i }}>
              <span className="iii-how__num">0{i + 1}</span>
              <span className="iii-how__verb">{s.verb}.</span>
              <span className="iii-how__line">{s.line}</span>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

const FILTERS: (QuestKind | 'ALL')[] = ['ALL', 'DISCOVERY', 'MUSIC', 'EXPLORATION', 'SECRET', 'TASTE'];

export function QuestFeed() {
  const [filter, setFilter] = useState<QuestKind | 'ALL'>('ALL');
  const { completed, log } = useQuestState();
  const doneCount = FESTIVAL_QUESTS.filter((q) => completed.has(q.id)).length;
  const earned = FESTIVAL_QUESTS.filter((q) => completed.has(q.id)).reduce((sum, q) => sum + q.xp, 0);

  return (
    <section id="quests" className="iii-section iii-feed" aria-labelledby="iii-feed-title">
      <div className="iii-wrap iii-feed__grid">
        <div className="iii-feed__intro">
          <SectionHead
            kicker="QUEST FEED · SAMPLE"
            title={
              <span id="iii-feed-title">
                YOUR NIGHT.
                <br />
                YOUR QUEST.
              </span>
            }
          >
            <p>
              What an attendee could see in sidequests: quests shaped by where they are, who's playing and what time
              it is. Accept one. Scan in. Watch it move.
            </p>
          </SectionHead>
          <dl className="iii-tally">
            <div>
              <dt>QUESTS DONE</dt>
              <dd>
                {doneCount}/{FESTIVAL_QUESTS.length}
              </dd>
            </div>
            <div>
              <dt>XP FROM FEED</dt>
              <dd>+{earned}</dd>
            </div>
          </dl>
        </div>

        <div className="iii-phone">
          <div className="iii-phone__bar">
            <span>TONIGHT · III POINTS</span>
            <span>FRI 9:41 PM</span>
          </div>
          <div className="iii-phone__sub">
            <strong>{FESTIVAL_QUESTS.length} QUESTS NEAR YOU</strong>
            <span>WYNWOOD · 25.80°N 80.20°W</span>
          </div>
          <div className="iii-chips" role="group" aria-label="Filter quests by type">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                className={cn('iii-chip', filter === f && 'is-on')}
                onClick={() => {
                  setFilter(f);
                  log('feed_filter', f);
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="iii-phone__list">
            {/* Filtered cards are hidden, not unmounted, so in-progress quests keep their state. */}
            {FESTIVAL_QUESTS.map((q) => (
              <div key={q.id} hidden={filter !== 'ALL' && q.kind !== filter}>
                <QuestCard quest={q} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
