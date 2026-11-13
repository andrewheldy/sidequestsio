/**
 * Mission brief dialog.
 *
 * A live mission is played on its quest page (`/quests/:id`), which owns sign-in,
 * the GPS presence check, the photo and the server-side completion. This dialog
 * never completes anything itself. The demo preview below only simulates the
 * steps: it reads no location, uploads nothing and credits no XP.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Circle, Clock, Lock, MapPin, Navigation } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ResolvedMission } from '@/lib/campaigns/missions';
import type { MissionVerification } from '@/lib/campaigns/types';
import { useCampaign } from './CampaignState';
import { MissionArt } from './art';
import { DIFFICULTY_LABEL, VERIFICATION_LABEL, directionsUrl, statusLabel } from './shared';

const SIMULATE_LABEL: Record<MissionVerification, string> = {
  gps: 'Simulate check-in',
  photo: 'Simulate photo',
  question: 'Answer',
  records: 'Check records',
};

function DemoPreview({ item }: { item: ResolvedMission }) {
  const { completePreview, log } = useCampaign();
  const { mission } = item;
  const steps = mission.verification;
  const [done, setDone] = useState(0);
  const [wrong, setWrong] = useState(false);
  const finished = item.status === 'previewed' || done >= steps.length;

  const advance = (step: MissionVerification) => {
    if (done === 0) log('mission_start', mission.id, { mode: 'demo' });
    if (step === 'gps') log('checkin_attempt', mission.id, { demo: true });
    if (step === 'photo') log('photo_submit', mission.id, { demo: true });
    const next = done + 1;
    setDone(next);
    setWrong(false);
    if (next >= steps.length) completePreview(mission.id);
  };

  return (
    <section className="vice-demo" aria-labelledby="vice-demo-title">
      <h3 id="vice-demo-title" className="vice-demo__title">
        Try it here <span className="vice-pill vice-pill--concept">Demo preview</span>
      </h3>
      <p className="vice-demo__note">
        A walkthrough of the steps. Your location is not read, nothing is saved, and no XP is credited to an account.
      </p>
      <ol className="vice-demo__steps">
        {steps.map((step, i) => {
          const state = finished || i < done ? 'done' : i === done ? 'current' : 'todo';
          return (
            <li key={step} className={cn('vice-demo__step', `is-${state}`)}>
              <span className="vice-demo__mark" aria-hidden="true">
                {state === 'done' ? <Check size={16} /> : <Circle size={16} />}
              </span>
              <div className="vice-demo__text">
                <strong>{VERIFICATION_LABEL[step].title}</strong>
                <span>{state === 'done' ? 'Done (simulated)' : VERIFICATION_LABEL[step].detail}</span>
                {state === 'current' && step === 'question' && mission.question && (
                  <fieldset className="vice-demo__question">
                    <legend>{mission.question.prompt}</legend>
                    {mission.question.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="vice-btn vice-btn--ghost vice-btn--sm"
                        onClick={() => (option === mission.question!.answer ? advance(step) : setWrong(true))}
                      >
                        {option}
                      </button>
                    ))}
                    <p role="status" className="vice-demo__wrong">
                      {wrong ? 'Not quite. Try another answer.' : ''}
                    </p>
                  </fieldset>
                )}
              </div>
              {state === 'current' && step !== 'question' && (
                <button type="button" className="vice-btn vice-btn--primary vice-btn--sm" onClick={() => advance(step)}>
                  {SIMULATE_LABEL[step]}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {finished && (
        <p className="vice-demo__result" role="status">
          <Check size={18} aria-hidden="true" />
          Previewed. A verified run would pay +{item.xp} XP and +{item.points} Points.
        </p>
      )}
    </section>
  );
}

function CompositeProgress({ item }: { item: ResolvedMission }) {
  const { missions } = useCampaign();
  const required = missions.filter((m) => item.mission.requires?.includes(m.mission.id));
  return (
    <section className="vice-demo" aria-labelledby="vice-circuit-title">
      <h3 id="vice-circuit-title" className="vice-demo__title">
        Circuit progress <span className="vice-pill vice-pill--concept">Demonstration</span>
      </h3>
      <p className="vice-demo__note">
        Multi-mission quests are not part of the live SideQuests engine yet. This card reads your progress on the other
        four missions to show how a circuit would unlock. It does not credit XP or Points.
      </p>
      <ol className="vice-demo__steps">
        {required.map((m) => {
          const isDone = m.status === 'completed' || m.status === 'previewed';
          return (
            <li key={m.mission.id} className={cn('vice-demo__step', isDone ? 'is-done' : 'is-todo')}>
              <span className="vice-demo__mark" aria-hidden="true">
                {isDone ? <Check size={16} /> : <Lock size={16} />}
              </span>
              <div className="vice-demo__text">
                <strong>{m.mission.title}</strong>
                <span>{statusLabel(m)}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {item.status === 'previewed' && (
        <p className="vice-demo__result" role="status">
          <Check size={18} aria-hidden="true" />
          Circuit closed. As a live composite it would pay +{item.xp} XP and +{item.points} Points.
        </p>
      )}
    </section>
  );
}

export function MissionSheet() {
  const { missions, openMissionId, closeMission, log, signedIn } = useCampaign();
  const item = missions.find((m) => m.mission.id === openMissionId);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && closeMission()}>
      {item && (
        <DialogContent className="vice vice-sheet">
          <div className="vice-sheet__art">
            <MissionArt art={item.mission.art} alt={item.mission.artAlt} />
            <span className={cn('vice-pill', item.mode === 'live' ? 'vice-pill--live' : 'vice-pill--concept')}>
              {item.mode === 'live' ? 'Live quest' : 'Concept'}
            </span>
          </div>

          <div className="vice-sheet__body">
            <p className="vice-kicker">
              Mission {item.mission.number} · {statusLabel(item)}
            </p>
            <DialogTitle className="vice-sheet__title">{item.mission.title}</DialogTitle>
            <DialogDescription className="vice-sheet__objective">{item.mission.objective}</DialogDescription>

            <dl className="vice-card__stats vice-sheet__stats">
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

            <ul className="vice-sheet__facts">
              <li>
                <MapPin size={16} aria-hidden="true" />
                <span>
                  {item.mission.place}, {item.mission.neighborhood}
                </span>
              </li>
              {item.mission.estimatedTime && (
                <li>
                  <Clock size={16} aria-hidden="true" />
                  <span>About {item.mission.estimatedTime}</span>
                </li>
              )}
              {item.mission.note && (
                <li>
                  <Circle size={16} aria-hidden="true" />
                  <span>{item.mission.note}</span>
                </li>
              )}
            </ul>

            <div className="vice-sheet__actions">
              {item.mode === 'live' && item.questId && (
                <Link
                  to={`/quests/${item.questId}`}
                  className="vice-btn vice-btn--primary"
                  onClick={() => log('mission_start', item.mission.id, { mode: 'live' })}
                >
                  {item.status === 'completed' ? 'Open the quest' : 'Play this mission'}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              )}
              {item.mission.lat != null && item.mission.lng != null && (
                <a
                  href={directionsUrl(item.mission.lat, item.mission.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vice-btn vice-btn--ghost"
                  onClick={() => log('directions_click', item.mission.id)}
                >
                  <Navigation size={18} aria-hidden="true" />
                  Directions
                  <span className="vice-sr"> (opens your maps app)</span>
                </a>
              )}
            </div>

            {item.mode === 'live' && (
              <p className="vice-sheet__live">
                {item.status === 'completed'
                  ? `Verified. Your account was credited +${item.verifiedXp} XP and +${item.verifiedPoints} Points.`
                  : `Plays through the live SideQuests quest “${item.mission.liveQuestTitle}”, which sets the check-in, proof and reward.${
                      signedIn ? '' : ' You will be asked to sign in before progress is saved.'
                    }`}
              </p>
            )}

            {item.mode === 'composite' ? (
              <CompositeProgress item={item} />
            ) : (
              item.status !== 'completed' && <DemoPreview key={item.mission.id} item={item} />
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
