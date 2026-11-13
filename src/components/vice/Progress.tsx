/**
 * Progression and rewards.
 *
 * Verified numbers come from the signed-in player's completion records. Demo
 * numbers come from this session's previews and are always labelled as such.
 * Reward cards describe what the platform already does; the campaign itself
 * offers no prize.
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gift, TrendingUp, Wallet } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';
import { useCampaign } from './CampaignState';
import { SectionHead, useCountUp } from './shared';

function Stat({ label, value, suffix, hint }: { label: string; value: number; suffix?: string; hint?: string }) {
  const shown = useCountUp(value);
  return (
    <div className="vice-stat">
      <dt>{label}</dt>
      <dd>
        <span aria-hidden="true">
          {shown.toLocaleString()}
          {suffix}
        </span>
        <span className="vice-sr">
          {value}
          {suffix}
        </span>
      </dd>
      {hint && <p>{hint}</p>}
    </div>
  );
}

export function ProgressRewards() {
  const { campaign, summary, loading, signedIn, log } = useCampaign();
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.12 });
  const done = summary.verified + summary.previewed;

  useEffect(() => {
    if (isVisible) log('reward_view');
  }, [isVisible, log]);

  return (
    <section ref={ref} id="progress" className={cn('vice-section vice-reveal', isVisible && 'is-in')} aria-labelledby="progress-title">
      <SectionHead id="progress-title" kicker="Progression" title={<>Every mission <em>moves the bar.</em></>}>
        <p>
          {signedIn
            ? 'Verified progress is read from your SideQuests completion records.'
            : 'Browsing as a guest. Previews count here for this visit only.'}{' '}
          {!signedIn && (
            <Link to={`/auth?next=${encodeURIComponent(`/${campaign.slug}`)}`} className="vice-link">
              Sign in to save verified progress
            </Link>
          )}
        </p>
      </SectionHead>

      <div className="vice-progress">
        <div className="vice-progress__bar-wrap">
          <div className="vice-progress__label">
            <span>Campaign progress</span>
            <strong>{summary.percent}%</strong>
          </div>
          <div
            className="vice-progress__bar"
            role="progressbar"
            aria-label="Campaign progress"
            aria-valuemin={0}
            aria-valuemax={summary.total}
            aria-valuenow={done}
            aria-valuetext={`${done} of ${summary.total} missions`}
          >
            <span className="vice-progress__fill vice-progress__fill--verified" style={{ width: `${(summary.verified / summary.total) * 100}%` }} />
            <span className="vice-progress__fill vice-progress__fill--demo" style={{ width: `${(summary.previewed / summary.total) * 100}%` }} />
          </div>
          <p className="vice-progress__legend">
            <span className="vice-dot vice-dot--verified" aria-hidden="true" /> Verified {summary.verified}
            <span className="vice-dot vice-dot--demo" aria-hidden="true" /> Demo preview {summary.previewed}
          </p>
        </div>

        {loading ? (
          <div className="vice-skeleton vice-skeleton--stats" role="status" aria-label="Loading progress" />
        ) : (
          <dl className="vice-stats">
            <Stat label="Missions done" value={done} suffix={`/${summary.total}`} hint={`${summary.verified} verified · ${summary.previewed} demo preview`} />
            <Stat label="XP earned" value={summary.verifiedXp} hint={summary.demoXp ? `+${summary.demoXp} in demo previews, not credited` : 'Verified by the server'} />
            <Stat label="Points earned" value={summary.verifiedPoints} hint={summary.demoPoints ? `+${summary.demoPoints} in demo previews, not credited` : 'Spendable in SideQuests'} />
            <Stat label="Available missions" value={summary.available} hint="Across four neighborhoods" />
          </dl>
        )}
      </div>

      <h3 className="vice-h3 vice-rewards__title">What missions unlock</h3>
      <ul className="vice-rewards">
        <li>
          <TrendingUp size={22} aria-hidden="true" />
          <strong>XP and levels</strong>
          <p>Every verified mission adds XP to your SideQuests level. XP is granted once per completion, on the server.</p>
        </li>
        <li>
          <Wallet size={22} aria-hidden="true" />
          <strong>Points</strong>
          <p>Verified missions also pay Points, the currency you spend on rewards in SideQuests.</p>
          <Link to="/app/rewards" className="vice-link">
            See current rewards
          </Link>
        </li>
        <li className="is-slot">
          <Gift size={22} aria-hidden="true" />
          <strong>Campaign reward slot</strong>
          <p>
            A brand can attach its own perk to a mission or to closing the circuit. None is offered in this concept, and
            nothing here can be redeemed.
          </p>
        </li>
      </ul>
    </section>
  );
}
