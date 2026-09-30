import { useState } from 'react';
import { LogoMark } from '@/components/brand/Logo';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';
import { Badge, BADGES, BadgeId, levelFor, REWARD_CATEGORIES } from './data';
import { useQuestState } from './QuestState';
import { SectionHead } from './shared';
import { useCountUp } from './useCountUp';

const SEGMENTS = 16;

/** Level, XP total and a segmented bar that fills as XP is earned anywhere on the page. */
export function XPProgress({ xp }: { xp: number }) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.4 });
  const { level, next, progress, toNext } = levelFor(xp);
  const shown = useCountUp(xp, isVisible);
  const filled = isVisible ? progress : 0;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div ref={ref} className="iii-xp">
      <div className="iii-xp__row">
        <p className="iii-xp__level">
          <span>LEVEL</span>
          <b>{pad(level)}</b>
        </p>
        <p className="iii-xp__total">
          <b>{Math.round(shown).toLocaleString('en-US')}</b>
          <span>XP</span>
        </p>
      </div>
      <div
        className="iii-xp__bar"
        role="progressbar"
        aria-label={`Progress to level ${pad(level + 1)}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <span className="iii-xp__fill" style={{ transform: `scaleX(${filled})` }} />
        {Array.from({ length: SEGMENTS - 1 }, (_, i) => (
          <span key={i} className="iii-xp__tick" style={{ left: `${((i + 1) / SEGMENTS) * 100}%` }} />
        ))}
      </div>
      <p className="iii-xp__next">
        {toNext.toLocaleString('en-US')} XP TO LEVEL {pad(level + 1)} <span aria-hidden="true">· {next.toLocaleString('en-US')}</span>
      </p>
    </div>
  );
}

export function QuestBadge({
  badge,
  earned,
  selected,
  onSelect,
}: {
  badge: Badge;
  earned: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn('iii-badge', `iii-badge--${badge.color}`, earned ? 'is-earned' : 'is-locked', selected && 'is-selected')}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="iii-badge__medal" aria-hidden="true">
        {badge.glyph}
      </span>
      <span className="iii-badge__name">{badge.name}</span>
      <span className="iii-badge__state">{earned ? 'EARNED' : 'LOCKED'}</span>
    </button>
  );
}

export function PlayerProfile() {
  const { totalXP, sessionXP, badges, log } = useQuestState();
  const [picked, setPicked] = useState<BadgeId>('energy-boost');
  const pickedBadge = BADGES.find((b) => b.id === picked)!;

  return (
    <section id="xp" className="iii-section iii-profile" aria-labelledby="iii-xp-title">
      <div className="iii-wrap">
        <SectionHead
          kicker="XP + PLAYER PROFILE · SAMPLE"
          title={
            <span id="iii-xp-title">
              EVERY EXPERIENCE
              <br />
              MOVES YOU FORWARD.
            </span>
          }
        >
          <p>XP is progression — it never gets spent. Points unlock rewards. Badges tell the story of the night.</p>
        </SectionHead>

        <div className="iii-profile__grid">
          <div className="iii-card iii-player">
            <div className="iii-player__id">
              <span className="iii-player__avatar">
                <LogoMark decorative className="w-10" />
              </span>
              <div>
                <p className="iii-player__class">EXPLORER</p>
                <p className="iii-player__handle">@nightcreature305 · SAMPLE PLAYER</p>
              </div>
            </div>
            <XPProgress xp={totalXP} />
            <p className="iii-player__session">
              {sessionXP > 0 ? (
                <>
                  <b>+{sessionXP} XP</b> earned playing this page.
                </>
              ) : (
                'Complete a quest above to watch this move.'
              )}
            </p>
          </div>

          <div className="iii-card iii-badges">
            <p className="iii-card__label">
              BADGES · {BADGES.filter((b) => badges.has(b.id)).length}/{BADGES.length}
            </p>
            <div className="iii-badges__grid">
              {BADGES.map((b) => (
                <QuestBadge
                  key={b.id}
                  badge={b}
                  earned={badges.has(b.id)}
                  selected={picked === b.id}
                  onSelect={() => {
                    setPicked(b.id);
                    log('badge_tap', b.id);
                  }}
                />
              ))}
            </div>
            <p className="iii-badges__detail" aria-live="polite">
              <b>{pickedBadge.name}</b> — {badges.has(picked) ? 'Earned. ' : 'Locked. '}
              {pickedBadge.how}
            </p>
          </div>
        </div>

        <div className="iii-unlocks">
          <p className="iii-kicker">
            <span className="iii-kicker__node" aria-hidden="true" />
            WHAT XP COULD UNLOCK · CONCEPT REWARDS
          </p>
          <ul className="iii-unlocks__grid">
            {REWARD_CATEGORIES.map((r) => (
              <li key={r.name}>
                <span className="iii-unlocks__name">{r.name}</span>
                <span className="iii-unlocks__line">{r.line}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="iii-bigline">
          XP DOESN'T HAVE TO DISAPPEAR
          <br />
          <mark>WHEN THE FESTIVAL ENDS.</mark>
        </p>
      </div>
    </section>
  );
}
