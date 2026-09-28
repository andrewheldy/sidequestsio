import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { doorOpening, doorPath, sparkPath } from './geometry';
import { Reveal } from './shared';

const PITCH_MAIL =
  'mailto:hello@miamisidequests.io?subject=' + encodeURIComponent('III Points × sidequests — build the quest');

/** Every path converges on one door. */
function Convergence() {
  const paths = [
    'M0 60 H220 V200 H400',
    'M0 330 H160 V250 H400',
    'M1000 50 H790 V190 H600',
    'M1000 340 H830 V250 H600',
    'M500 0 V70',
  ];
  return (
    <svg className="iii-converge" viewBox="0 0 1000 400" aria-hidden="true">
      <g className="iii-draw-group" fill="none" stroke="#0A0A0A" strokeWidth="4">
        {paths.map((d, i) => (
          <path key={d} d={d} pathLength={1} style={{ ['--i' as string]: i }} />
        ))}
      </g>
      <path d={doorOpening(500, 390, 8)} fill="#BEF04A" />
      <path d={doorPath(500, 390, 8)} fill="#0A0A0A" />
      <path className="iii-spark" d={sparkPath(500, 250, 26)} fill="#0A0A0A" />
      <rect x="0" y="388" width="1000" height="12" fill="#0A0A0A" />
    </svg>
  );
}

export function FinalSection() {
  return (
    <section className="iii-final" aria-labelledby="iii-final-title">
      <Reveal className="iii-final__art">
        <Convergence />
      </Reveal>
      <div className="iii-wrap iii-final__inner">
        <h2 id="iii-final-title" className="iii-final__title">
          TURN III POINTS
          <br />
          INTO A WORLD
          <br />
          <mark>WORTH EXPLORING.</mark>
        </h2>
        <p className="iii-final__lede">
          sidequests adds an interactive layer to the festival — connecting music, art, brands, people, and Miami
          itself.
        </p>
        <div className="iii-final__ctas">
          <a href={PITCH_MAIL} className="iii-btn iii-btn--ink iii-btn--xl">
            BUILD THE QUEST
          </a>
          <Link to="/" className="iii-btn iii-btn--ghost iii-btn--lg">
            EXPLORE MIAMI SIDEQUESTS
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ConceptFooter() {
  return (
    <footer className="iii-footer">
      <div className="iii-wrap iii-footer__inner">
        <Link to="/" className="iii-footer__brand" aria-label="sidequests home">
          <Logo size="lg" tone="reverse" decorative />
        </Link>
        <p className="iii-footer__url">miamisidequests.io</p>
        <p className="iii-footer__disclaimer">
          Unofficial SideQuests concept created to demonstrate a potential interactive III Points festival experience.
          Brand and sponsor names are shown solely as illustrative examples of potential activations.
        </p>
      </div>
    </footer>
  );
}
