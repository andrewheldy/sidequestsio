/** Top bar and cinematic hero for /vice. */
import { Link } from 'react-router-dom';
import { ArrowDown } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useCampaign } from './CampaignState';
import { HeroPalms, HeroSkyline } from './art';
import { useCountUp } from './shared';

export function CampaignNav() {
  const { summary } = useCampaign();
  const total = summary.verifiedXp + summary.demoXp;
  const xp = useCountUp(total);
  // Demo previews are never shown as earned XP.
  const unit = summary.demoXp > 0 ? (summary.verifiedXp > 0 ? 'XP incl. demo' : 'Demo XP') : 'XP';
  return (
    <header className="vice-nav">
      <Link to="/" className="vice-nav__brand" aria-label="sidequests home">
        <Logo tone="reverse" size="sm" decorative />
      </Link>
      <span className="vice-pill vice-pill--concept">Concept</span>
      <nav className="vice-nav__links" aria-label="Campaign sections">
        <a href="#missions">Missions</a>
        <a href="#map">Map</a>
        <a href="#progress">Progress</a>
      </nav>
      <a href="#progress" className="vice-nav__xp" aria-label={`${total} ${unit}. View progress`}>
        <span aria-hidden="true">{xp.toLocaleString()}</span>
        <small aria-hidden="true">{unit}</small>
      </a>
    </header>
  );
}

export function CampaignHero() {
  const { campaign, log } = useCampaign();
  return (
    <section className="vice-hero" aria-labelledby="vice-title">
      <div className="vice-hero__sky">
        <div className="vice-hero__scene" aria-hidden="true">
          <div className="vice-hero__sun" />
          <div className="vice-hero__haze" />
          <HeroSkyline className="vice-hero__skyline" />
          <HeroPalms side="left" className="vice-hero__palms vice-hero__palms--left" />
          <HeroPalms side="right" className="vice-hero__palms vice-hero__palms--right" />
        </div>
        <div className="vice-hero__headline">
          <p className="vice-hero__eyebrow">
            <span>Miami</span>
            <span aria-hidden="true">·</span>
            <span>A real-world mission series</span>
          </p>
          <h1 id="vice-title" className="vice-hero__title">
            <span className="vice-hero__word">{campaign.name}</span>
            <span className="vice-hero__tagline">{campaign.tagline}</span>
          </h1>
        </div>
      </div>

      <div className="vice-hero__below">
        <p className="vice-hero__intro">{campaign.intro}</p>
        <div className="vice-hero__actions">
          <a href="#map" className="vice-btn vice-btn--primary" onClick={() => log('start_exploring')}>
            Start exploring
          </a>
          <a href="#missions" className="vice-btn vice-btn--ghost" onClick={() => log('view_missions')}>
            View missions
            <ArrowDown size={18} aria-hidden="true" />
          </a>
        </div>
        <p className="vice-hero__powered">
          Powered by <Link to="/">sidequests</Link>
        </p>
        <p className="vice-hero__disclosure">{campaign.disclosure}</p>
      </div>
    </section>
  );
}
