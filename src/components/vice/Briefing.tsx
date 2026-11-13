/** Mission briefing: the five-step loop, as a tappable stepper. */
import { useState } from 'react';
import { BadgeCheck, Compass, MapPinned, Sparkles, Target, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal, SectionHead } from './shared';

const STEPS: { title: string; detail: string; icon: LucideIcon }[] = [
  { title: 'Discover a mission', detail: 'Pick a mission from the board or the map. Each one points at a public place worth the trip.', icon: Compass },
  { title: 'Travel to its location', detail: 'Get directions in your own maps app and head out. The city is the level.', icon: MapPinned },
  { title: 'Complete the challenge', detail: 'Find the mural, frame the skyline, read the street. Every mission asks for something you can only do there.', icon: Target },
  { title: 'Verify your participation', detail: 'A location check-in, a photo, or both. Your location is only read when you tap to check in.', icon: BadgeCheck },
  { title: 'Earn XP and unlock rewards', detail: 'Verified missions pay XP toward your level and Points you can spend in SideQuests.', icon: Sparkles },
];

export function MissionBriefing() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];
  const Icon = step.icon;
  return (
    <Reveal as="section" id="briefing" className="vice-section vice-briefing" labelledBy="briefing-title">
      <SectionHead id="briefing-title" kicker="Mission briefing" title={<>Your city. Your missions. <em>Your story.</em></>}>
        <p>Five moves, start to finish. Tap through the loop.</p>
      </SectionHead>

      <div className="vice-steps">
        <ol className="vice-steps__list">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                className={cn('vice-step', i === active && 'is-active', i < active && 'is-done')}
                aria-pressed={i === active}
                onClick={() => setActive(i)}
              >
                <span className="vice-step__num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="vice-step__title">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="vice-steps__panel" aria-live="polite">
          <div className="vice-steps__icon" aria-hidden="true">
            <Icon size={30} />
          </div>
          <div>
            <p className="vice-steps__count">
              Step {active + 1} of {STEPS.length}
            </p>
            <h3 className="vice-h3">{step.title}</h3>
            <p>{step.detail}</p>
          </div>
          <button
            type="button"
            className="vice-btn vice-btn--ghost vice-btn--sm"
            onClick={() => setActive((active + 1) % STEPS.length)}
          >
            {active === STEPS.length - 1 ? 'Back to step 1' : 'Next step'}
          </button>
        </div>
      </div>
    </Reveal>
  );
}
