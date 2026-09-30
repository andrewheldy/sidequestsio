import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FestivalQuest, KIND_LABEL } from './data';
import { useQuestState } from './QuestState';

/** Segmented progress: one block per check-in. */
export function StepProgress({ steps, done, label }: { steps: string[]; done: number; label: string }) {
  return (
    <div
      className="iii-steps"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={steps.length}
      aria-valuenow={done}
      aria-valuetext={`${done} of ${steps.length} complete`}
    >
      {steps.map((s, i) => (
        <span key={s} className={cn('iii-steps__seg', i < done && 'is-done', i === done && 'is-next')}>
          <span className="iii-steps__label">{s}</span>
        </span>
      ))}
    </div>
  );
}

export function Pips({ value, max = 3 }: { value: number; max?: number }) {
  return (
    <span className="iii-pips" aria-label={`Difficulty ${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cn('iii-pips__pip', i < value && 'is-on')} />
      ))}
    </span>
  );
}

/**
 * A playable quest card: ACCEPT QUEST → QUEST ACTIVE (scan each check-in) →
 * QUEST COMPLETE. Each "scan" stands in for the real QR check-in.
 */
export function QuestCard({ quest }: { quest: FestivalQuest }) {
  const { completed, complete, log } = useQuestState();
  const reduce = useReducedMotion();
  const done = completed.has(quest.id);
  const [accepted, setAccepted] = useState(false);
  const [step, setStep] = useState(0);
  const [scanning, setScanning] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const status = done ? 'complete' : accepted ? 'active' : 'idle';
  const progress = done ? quest.steps.length : step;
  const secret = quest.kind === 'SECRET';

  function accept() {
    setAccepted(true);
    log('quest_accept', quest.id);
  }

  function scan() {
    if (scanning) return;
    setScanning(true);
    timer.current = window.setTimeout(
      () => {
        setScanning(false);
        const next = step + 1;
        setStep(next);
        if (next >= quest.steps.length) complete(quest.id, quest.xp, quest.title, quest.badge);
      },
      reduce ? 0 : 650,
    );
  }

  return (
    <article
      id={`quest-${quest.id}`}
      className={cn('iii-qcard', `iii-qcard--${quest.kind.toLowerCase()}`, `is-${status}`)}
      aria-labelledby={`quest-${quest.id}-title`}
    >
      <div className="iii-qcard__top">
        <span className="iii-tag">{KIND_LABEL[quest.kind]}</span>
        {status !== 'idle' && (
          <span className={cn('iii-status', done && 'is-done')}>{done ? '✓ COMPLETE' : '● QUEST ACTIVE'}</span>
        )}
        <span className="iii-xpchip">+{quest.xp} XP</span>
      </div>

      <h3 id={`quest-${quest.id}-title`} className="iii-qcard__title">
        {quest.title}
      </h3>
      <p className="iii-qcard__copy">{quest.copy}</p>
      {quest.hint && <p className="iii-qcard__hint">{quest.hint}</p>}

      <dl className="iii-meta">
        <div>
          <dt>DIFFICULTY</dt>
          <dd>
            <Pips value={quest.difficulty} />
          </dd>
        </div>
        <div>
          <dt>TIME</dt>
          <dd>{quest.time}</dd>
        </div>
        <div>
          <dt>LOCATION</dt>
          <dd className={cn(secret && !done && 'iii-obscured')}>{secret && done ? 'THE HIDDEN DOOR' : quest.location}</dd>
        </div>
        <div>
          <dt>REWARD</dt>
          <dd>{quest.reward}</dd>
        </div>
        {quest.sponsor && (
          <div className="iii-meta__wide">
            <dt>SPONSOR</dt>
            <dd>{quest.sponsor}</dd>
          </div>
        )}
      </dl>

      {status !== 'idle' && (
        <>
          <StepProgress steps={quest.steps} done={progress} label={`${quest.title} progress`} />
          <p className="iii-qcard__progress">
            {progress} / {quest.steps.length} COMPLETE
            {!done && <span> · NEXT: {quest.steps[progress]}</span>}
          </p>
        </>
      )}

      <div className="iii-qcard__action">
        {status === 'idle' && (
          <button type="button" className="iii-btn iii-btn--lime iii-btn--block" onClick={accept}>
            ACCEPT QUEST
          </button>
        )}
        {status === 'active' && (
          <button
            type="button"
            className={cn('iii-btn iii-btn--ink iii-btn--block iii-scanbtn', scanning && 'is-scanning')}
            onClick={scan}
            aria-busy={scanning}
          >
            {scanning ? 'SCANNING QR…' : `SCAN TO CHECK IN · ${step + 1}/${quest.steps.length}`}
          </button>
        )}
        {status === 'complete' && (
          <p className="iii-complete">
            <span>QUEST COMPLETE</span>
            <b>+{quest.xp} XP</b>
          </p>
        )}
      </div>
    </article>
  );
}
