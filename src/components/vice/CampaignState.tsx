/**
 * Shared state for the /vice campaign page.
 *
 * Reads live quests and the signed-in player's completion records through the
 * repository (the same queries Explore uses) and resolves each mission against
 * them. The only state owned here is the demo preview: which missions a
 * visitor has walked through this session. That set is never persisted or sent
 * anywhere and never becomes XP; real progress comes only from completions.
 */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/analytics/events';
import { getRepository } from '@/lib/db';
import {
  resolveMissions,
  summarizeCampaign,
  type CampaignSummary,
  type ResolvedMission,
} from '@/lib/campaigns/missions';
import type { CampaignConfig } from '@/lib/campaigns/types';

interface Flash {
  key: number;
  xp: number;
  title: string;
}

interface CampaignStateValue {
  campaign: CampaignConfig;
  missions: ResolvedMission[];
  summary: CampaignSummary;
  /** Live quest data is still loading; rewards and status may change. */
  loading: boolean;
  /** Live quest data failed to load; missions fall back to concept previews. */
  liveUnavailable: boolean;
  signedIn: boolean;
  openMissionId: string | null;
  openMission: (id: string) => void;
  closeMission: () => void;
  /** Idempotent: previewing a mission twice changes nothing. */
  completePreview: (id: string) => void;
  /** Campaign telemetry via the app's consent-gated event sink. Never pass coordinates or PII. */
  log: (action: string, target?: string, extra?: Record<string, string | number | boolean>) => void;
  flash: Flash | null;
}

const CampaignStateContext = createContext<CampaignStateValue | null>(null);

export function CampaignStateProvider({ campaign, children }: { campaign: CampaignConfig; children: ReactNode }) {
  const { user } = useAuth();
  const [previewed, setPreviewed] = useState<Set<string>>(() => new Set());
  const previewedRef = useRef(previewed);
  const [openMissionId, setOpenMissionId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const timers = useRef<number[]>([]);

  const questsQuery = useQuery({
    queryKey: ['active-quests'],
    queryFn: async () => (await getRepository()).listQuests({ status: 'active' }),
    retry: 0,
  });
  const completionsQuery = useQuery({
    queryKey: ['completions', user?.id],
    queryFn: async () => (await getRepository()).listCompletions(user!.id),
    enabled: !!user,
  });

  const quests = questsQuery.data;
  const completions = completionsQuery.data;
  const missions = useMemo(
    () => resolveMissions(campaign.missions, quests ?? [], completions ?? [], previewed),
    [campaign.missions, quests, completions, previewed],
  );
  const summary = useMemo(() => summarizeCampaign(missions), [missions]);
  const missionsRef = useRef(missions);
  missionsRef.current = missions;

  const log = useCallback<CampaignStateValue['log']>(
    (action, target, extra) => {
      track('concept_interaction', {
        props: { page: campaign.analyticsPage, action, ...(target ? { target } : {}), ...extra },
      });
    },
    [campaign.analyticsPage],
  );

  const showFlash = useCallback((xp: number, title: string) => {
    setFlash({ key: Date.now(), xp, title });
    timers.current.push(window.setTimeout(() => setFlash(null), 2600));
  }, []);

  const completePreview = useCallback(
    (id: string) => {
      const before = missionsRef.current;
      const target = before.find((m) => m.mission.id === id);
      if (!target || target.mode === 'composite' || target.status !== 'available') return;
      if (previewedRef.current.has(id)) return;

      const next = new Set(previewedRef.current).add(id);
      previewedRef.current = next;
      setPreviewed(next);
      showFlash(target.xp, target.mission.title);
      log('mission_complete', id, { demo: true });

      // A composite that this preview just unlocked gets its own moment.
      const after = resolveMissions(campaign.missions, quests ?? [], completions ?? [], next);
      const unlocked = after.find(
        (m) => m.mode === 'composite' && m.status === 'previewed' && before.find((b) => b.mission.id === m.mission.id)?.status === 'locked',
      );
      if (unlocked) {
        timers.current.push(
          window.setTimeout(() => {
            showFlash(unlocked.xp, unlocked.mission.title);
            log('mission_complete', unlocked.mission.id, { demo: true });
          }, 2800),
        );
      }
    },
    [campaign.missions, quests, completions, log, showFlash],
  );

  const openMission = useCallback(
    (id: string) => {
      setOpenMissionId(id);
      log('mission_view', id);
    },
    [log],
  );
  const closeMission = useCallback(() => setOpenMissionId(null), []);

  useEffect(() => {
    log('page_view');
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, [log]);

  const value = useMemo<CampaignStateValue>(
    () => ({
      campaign,
      missions,
      summary,
      loading: questsQuery.isLoading || (!!user && completionsQuery.isLoading),
      liveUnavailable: questsQuery.isError,
      signedIn: !!user,
      openMissionId,
      openMission,
      closeMission,
      completePreview,
      log,
      flash,
    }),
    [campaign, missions, summary, questsQuery.isLoading, questsQuery.isError, completionsQuery.isLoading, user, openMissionId, openMission, closeMission, completePreview, log, flash],
  );

  return <CampaignStateContext.Provider value={value}>{children}</CampaignStateContext.Provider>;
}

export function useCampaign() {
  const ctx = useContext(CampaignStateContext);
  if (!ctx) throw new Error('useCampaign must be used inside CampaignStateProvider');
  return ctx;
}

/** The "+300 XP" burst after a demo preview, announced to screen readers. */
export function XPFlash() {
  const { flash } = useCampaign();
  return (
    <>
      <div className="vice-sr" role="status" aria-live="polite">
        {flash ? `${flash.title} previewed. Plus ${flash.xp} XP in the demo. Nothing was credited to an account.` : ''}
      </div>
      {flash && (
        <div key={flash.key} className="vice-flash" aria-hidden="true">
          <span className="vice-flash__label">MISSION PREVIEWED · DEMO</span>
          <span className="vice-flash__xp">+{flash.xp} XP</span>
          <span className="vice-flash__title">{flash.title}</span>
        </div>
      )}
    </>
  );
}
