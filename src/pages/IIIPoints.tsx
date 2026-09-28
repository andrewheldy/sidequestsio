/**
 * /iiipoints — an unofficial sidequests × III Points concept microsite.
 *
 * A pitch prototype, not a product surface: it plays entirely in the browser
 * (see QuestState), touches no backend data, and is lazy-loaded so none of its
 * fonts, styles or code reach the rest of the site. It is kept out of search
 * indexes because it uses third-party brand names as illustrative examples.
 */
import { useEffect } from 'react';
import { ConceptDashboard } from '@/components/iiipoints/ConceptDashboard';
import { ConceptFestivalMap } from '@/components/iiipoints/ConceptFestivalMap';
import { FestivalHero, GateBand } from '@/components/iiipoints/FestivalHero';
import { FestivalNav } from '@/components/iiipoints/FestivalNav';
import { ConceptFooter, FinalSection } from '@/components/iiipoints/FinalSection';
import { MiamiContinuation } from '@/components/iiipoints/MiamiContinuation';
import { PlayerProfile } from '@/components/iiipoints/PlayerProfile';
import { HowItWorks, QuestFeed } from '@/components/iiipoints/QuestFeed';
import { QuestStateProvider, XPFlash } from '@/components/iiipoints/QuestState';
import { SponsorActivation, SponsorQuests } from '@/components/iiipoints/SponsorActivation';
import { ThreeSidedValue } from '@/components/iiipoints/ThreeSidedValue';
import '@/components/iiipoints/iiipoints.css';

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Anton&family=IBM+Plex+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;700&display=swap';

/** Page-scoped <head> changes, undone on the way out so the rest of the site is untouched. */
function usePageHead() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'sidequests × III Points — concept experience';

    const added: HTMLElement[] = [];
    const add = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string>) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      added.push(el);
    };
    add('link', { rel: 'stylesheet', href: FONTS_HREF });
    add('meta', { name: 'robots', content: 'noindex, nofollow' });

    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prevTheme = theme?.content;
    theme?.setAttribute('content', '#C9AEF4');

    const root = document.documentElement;
    const prevScroll = root.style.scrollBehavior;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.style.scrollBehavior = 'smooth';

    return () => {
      document.title = prevTitle;
      added.forEach((el) => el.remove());
      if (theme && prevTheme) theme.setAttribute('content', prevTheme);
      root.style.scrollBehavior = prevScroll;
    };
  }, []);
}

export default function IIIPoints() {
  usePageHead();

  return (
    <QuestStateProvider>
      <div className="iii">
        <a href="#quests" className="iii-skip">
          Skip to the quests
        </a>
        <FestivalNav />
        <main>
          <FestivalHero />
          <GateBand />
          <HowItWorks />
          <QuestFeed />
          <SponsorQuests />
          <SponsorActivation />
          <ConceptFestivalMap />
          <PlayerProfile />
          <MiamiContinuation />
          <ThreeSidedValue />
          <ConceptDashboard />
          <FinalSection />
        </main>
        <ConceptFooter />
        <XPFlash />
      </div>
    </QuestStateProvider>
  );
}
