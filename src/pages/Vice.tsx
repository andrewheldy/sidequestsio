/**
 * /vice — "VICE — THE CITY IS YOUR PLAYGROUND", an unofficial SideQuests
 * concept for a brand activation running on the existing quest engine.
 *
 * The page is a themed layer driven by src/lib/campaigns/vice.ts. Missions
 * backed by an active quest are played, verified and rewarded on that quest's
 * own page; the rest are concept content with a labelled demo preview. It is
 * lazy-loaded and kept out of search indexes (see vercel.json), and its fonts,
 * title and theme colour are added on mount and removed on the way out.
 */
import { useEffect } from 'react';
import { MissionBriefing } from '@/components/vice/Briefing';
import { CampaignStateProvider, XPFlash } from '@/components/vice/CampaignState';
import { CampaignHero, CampaignNav } from '@/components/vice/Hero';
import { MissionMap } from '@/components/vice/MissionMap';
import { MissionSheet } from '@/components/vice/MissionSheet';
import { MissionBoard } from '@/components/vice/Missions';
import { CampaignFooter, PoweredBy } from '@/components/vice/Powered';
import { ProgressRewards } from '@/components/vice/Progress';
import { VICE_CAMPAIGN } from '@/lib/campaigns/vice';
import type { CampaignConfig } from '@/lib/campaigns/types';
import '@/components/vice/vice.css';

/** Page-scoped <head> changes, undone on unmount so the rest of the site is untouched. */
function usePageHead(head: CampaignConfig['head']) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = head.title;

    const added: HTMLElement[] = [];
    const add = <K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string>) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      added.push(el);
    };
    add('link', { rel: 'stylesheet', href: head.fontsHref });
    if (head.noindex) add('meta', { name: 'robots', content: 'noindex, nofollow' });

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDescription = description?.content;
    description?.setAttribute('content', head.description);

    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prevTheme = theme?.content;
    theme?.setAttribute('content', head.themeColor);

    const root = document.documentElement;
    const prevScroll = root.style.scrollBehavior;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.style.scrollBehavior = 'smooth';

    return () => {
      root.style.scrollBehavior = prevScroll;
      document.title = prevTitle;
      added.forEach((el) => el.remove());
      if (description && prevDescription != null) description.setAttribute('content', prevDescription);
      if (theme && prevTheme) theme.setAttribute('content', prevTheme);
    };
  }, [head]);
}

export default function Vice() {
  usePageHead(VICE_CAMPAIGN.head);

  return (
    <CampaignStateProvider campaign={VICE_CAMPAIGN}>
      <div className="vice vice-page">
        <a href="#missions" className="vice-skip">
          Skip to the missions
        </a>
        <CampaignNav />
        <main>
          <CampaignHero />
          <MissionBriefing />
          <MissionBoard />
          <MissionMap />
          <ProgressRewards />
          <PoweredBy />
        </main>
        <CampaignFooter />
        <MissionSheet />
        <XPFlash />
      </div>
    </CampaignStateProvider>
  );
}
