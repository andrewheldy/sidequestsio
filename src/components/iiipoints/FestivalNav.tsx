import { useEffect, useState } from 'react';
import { ListChecks, Map, Palmtree, Sparkles, Zap } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { useQuestState } from './QuestState';

const LINKS = [
  { id: 'quests', label: 'QUESTS', icon: ListChecks },
  { id: 'map', label: 'MAP', icon: Map },
  { id: 'xp', label: 'XP', icon: Zap },
  { id: 'brands', label: 'FOR BRANDS', short: 'BRANDS', icon: Sparkles },
  { id: 'miami', label: 'MIAMI', icon: Palmtree },
] as const;

/** Which nav section is currently mid-screen. */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const IDS = LINKS.map((l) => l.id);

export function FestivalNav() {
  const { totalXP, sessionXP } = useQuestState();
  const active = useActiveSection(IDS);

  return (
    <>
      <header className="iii-nav">
        <a href="#top" className="iii-nav__brand" aria-label="sidequests × III Points concept — back to top">
          <Logo size="sm" decorative />
          <span className="iii-nav__x" aria-hidden="true">
            × III POINTS
          </span>
        </a>
        <nav aria-label="Concept sections" className="iii-nav__links">
          {LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} className={cn('iii-nav__link', active === l.id && 'is-active')}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="iii-nav__right">
          <span className="iii-hud" title="Sample explorer XP — play the page to earn more">
            <span className="iii-hud__label">XP</span>
            <span key={totalXP} className={cn('iii-hud__value', sessionXP > 0 && 'is-bump')}>
              {totalXP.toLocaleString('en-US')}
            </span>
          </span>
          <a href="#quests" className="iii-btn iii-btn--lime iii-btn--sm">
            START QUEST
          </a>
        </div>
      </header>

      {/* Companion-app style tab bar, phones only. */}
      <nav aria-label="Concept sections" className="iii-tabbar">
        {LINKS.map(({ id, label, icon: Icon, ...rest }) => (
          <a key={id} href={`#${id}`} className={cn('iii-tabbar__item', active === id && 'is-active')}>
            <Icon aria-hidden="true" size={20} strokeWidth={2.4} />
            <span>{'short' in rest ? rest.short : label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
