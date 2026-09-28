/**
 * Session-only game state for the /iiipoints concept page.
 *
 * Every section reads from the same store so the page plays as one world:
 * completing a quest in the feed lights up a badge in the profile, unlocking
 * the after-dark quest reveals its node on the map, and the XP total carries
 * into the Miami section. Nothing is persisted or sent to the backend — this
 * is a prototype, not the real quest/points system.
 */
import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { track } from '@/lib/analytics/events';
import { BadgeId, BASE_XP, levelFor, STARTING_BADGES } from './data';

interface Flash {
  key: number;
  xp: number;
  title: string;
  levelUp?: number;
}

interface QuestStateValue {
  totalXP: number;
  sessionXP: number;
  completed: ReadonlySet<string>;
  badges: ReadonlySet<BadgeId>;
  afterDark: boolean;
  /** Idempotent: completing an already-completed quest does nothing. */
  complete: (questId: string, xp: number, title: string, badge?: BadgeId) => void;
  setAfterDark: () => void;
  /** Fire-and-forget interaction telemetry, via the app's event sink. */
  log: (action: string, target: string) => void;
  flash: Flash | null;
}

const QuestStateContext = createContext<QuestStateValue | null>(null);

export function QuestStateProvider({ children }: { children: ReactNode }) {
  const [sessionXP, setSessionXP] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const [badges, setBadges] = useState<Set<BadgeId>>(() => new Set(STARTING_BADGES));
  const [afterDark, setAfterDarkState] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const flashTimer = useRef<number>();
  // Refs mirror state so `complete` stays stable and idempotent under rapid taps.
  const completedRef = useRef(completed);
  const xpRef = useRef(sessionXP);

  const log = useCallback((action: string, target: string) => {
    track('concept_interaction', { props: { page: 'iiipoints', action, target } });
  }, []);

  const complete = useCallback(
    (questId: string, xp: number, title: string, badge?: BadgeId) => {
      if (completedRef.current.has(questId)) return;
      const nextCompleted = new Set(completedRef.current).add(questId);
      completedRef.current = nextCompleted;
      setCompleted(nextCompleted);

      const before = levelFor(BASE_XP + xpRef.current).level;
      xpRef.current += xp;
      setSessionXP(xpRef.current);
      const after = levelFor(BASE_XP + xpRef.current).level;

      if (badge) setBadges((prev) => new Set(prev).add(badge));

      window.clearTimeout(flashTimer.current);
      setFlash({ key: Date.now(), xp, title, levelUp: after > before ? after : undefined });
      flashTimer.current = window.setTimeout(() => setFlash(null), 2600);
      log('quest_complete', questId);
    },
    [log],
  );

  const setAfterDark = useCallback(() => setAfterDarkState(true), []);

  const value = useMemo(
    () => ({
      totalXP: BASE_XP + sessionXP,
      sessionXP,
      completed,
      badges,
      afterDark,
      complete,
      setAfterDark,
      log,
      flash,
    }),
    [sessionXP, completed, badges, afterDark, complete, setAfterDark, log, flash],
  );

  return <QuestStateContext.Provider value={value}>{children}</QuestStateContext.Provider>;
}

export function useQuestState() {
  const ctx = useContext(QuestStateContext);
  if (!ctx) throw new Error('useQuestState must be used inside QuestStateProvider');
  return ctx;
}

/** The "+250 XP" burst shown after any completion, announced to screen readers. */
export function XPFlash() {
  const { flash } = useQuestState();
  return (
    <>
      <div className="iii-sr" role="status" aria-live="polite">
        {flash ? `${flash.title} complete. Plus ${flash.xp} XP.${flash.levelUp ? ` Level up: level ${flash.levelUp}.` : ''}` : ''}
      </div>
      {flash && (
        <div key={flash.key} className="iii-flash" aria-hidden="true">
          <span className="iii-flash__label">{flash.levelUp ? `LEVEL ${String(flash.levelUp).padStart(2, '0')} UNLOCKED` : 'QUEST COMPLETE'}</span>
          <span className="iii-flash__xp">+{flash.xp} XP</span>
          <span className="iii-flash__title">{flash.title}</span>
        </div>
      )}
    </>
  );
}
