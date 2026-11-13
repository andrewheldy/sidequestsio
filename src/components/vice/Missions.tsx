/** The mission board: one card per campaign mission. */
import { Check, Clock, Lock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResolvedMission } from '@/lib/campaigns/missions';
import { useCampaign } from './CampaignState';
import { MissionArt } from './art';
import { DIFFICULTY_LABEL, Reveal, SectionHead, statusLabel } from './shared';

function MissionCard({ item }: { item: ResolvedMission }) {
  const { openMission, loading } = useCampaign();
  const { mission } = item;
  const titleId = `mission-${mission.id}`;
  return (
    <article className={cn('vice-card', `is-${item.status}`)} aria-labelledby={titleId}>
      <div className="vice-card__art">
        <MissionArt art={mission.art} alt={mission.artAlt} />
        <span className="vice-card__num" aria-hidden="true">
          {mission.number}
        </span>
        <span className={cn('vice-pill', item.mode === 'live' ? 'vice-pill--live' : 'vice-pill--concept')}>
          {item.mode === 'live' ? 'Live quest' : 'Concept'}
        </span>
      </div>

      <div className="vice-card__body">
        <p className="vice-card__where">
          <MapPin size={14} aria-hidden="true" />
          {mission.neighborhood}
        </p>
        <h3 id={titleId} className="vice-card__title">
          {mission.title}
        </h3>

        {loading ? (
          <div className="vice-skeleton vice-skeleton--row" role="status" aria-label="Loading mission details" />
        ) : (
          <>
            <dl className="vice-card__stats">
              <div>
                <dt>Difficulty</dt>
                <dd className={`vice-diff vice-diff--${item.difficulty}`}>{DIFFICULTY_LABEL[item.difficulty]}</dd>
              </div>
              <div>
                <dt>XP</dt>
                <dd>+{item.xp}</dd>
              </div>
              <div>
                <dt>Points</dt>
                <dd>+{item.points}</dd>
              </div>
            </dl>
            <p className="vice-card__meta">
              {mission.estimatedTime && (
                <span>
                  <Clock size={14} aria-hidden="true" />
                  {mission.estimatedTime}
                </span>
              )}
              <span className="vice-card__status">
                {item.status === 'completed' && <Check size={14} aria-hidden="true" />}
                {item.status === 'locked' && <Lock size={14} aria-hidden="true" />}
                {statusLabel(item)}
              </span>
            </p>
          </>
        )}

        <button type="button" className="vice-btn vice-btn--card" onClick={() => openMission(mission.id)}>
          {item.status === 'completed' || item.status === 'previewed' ? 'Review mission' : 'View mission'}
          <span className="vice-sr">: {mission.title}</span>
        </button>
      </div>
    </article>
  );
}

export function MissionBoard() {
  const { missions, liveUnavailable } = useCampaign();
  return (
    <Reveal as="section" id="missions" className="vice-section" labelledBy="missions-title">
      <SectionHead id="missions-title" kicker="Explore Miami" title={<>Five missions. <em>One city.</em></>}>
        <p>
          Starter missions for the concept. Missions marked <strong>Live quest</strong> play through a real SideQuests quest
          and pay that quest's rewards. Missions marked <strong>Concept</strong> can be previewed here as a demo.
        </p>
        {liveUnavailable && (
          <p className="vice-note" role="status">
            Live quest data is unavailable right now, so every mission is shown as a concept preview.
          </p>
        )}
      </SectionHead>
      <div className="vice-grid">
        {missions.map((item) => (
          <MissionCard key={item.mission.id} item={item} />
        ))}
      </div>
    </Reveal>
  );
}
