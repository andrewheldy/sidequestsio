import { Link } from 'react-router-dom';
import { ArrowUpRight, Mail } from 'lucide-react';
import logoReverse from '../../../brand/logos/logo-reverse.svg';

const footerGroups = [
  {
    title: 'Explore',
    links: [
      ['Quests', '/quests'],
      ['Map', '/app/map'],
      ['Community Notes', '/community-notes'],
      ['Sign in', '/auth'],
    ],
  },
  {
    title: 'Partners',
    links: [
      ['Become a partner', '/partnerships'],
      ['For hosts', '/hosts'],
      ['Partner terms', '/partner-terms'],
    ],
  },
  {
    title: 'Trust',
    links: [
      ['Privacy', '/privacy'],
      ['Terms', '/terms'],
      ['Community guidelines', '/community-guidelines'],
      ['Cookie choices', '/cookie-preferences'],
      ['Delete account', '/delete-account'],
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[hsl(var(--midnight-900))] text-[hsl(var(--sand-50))]">
      <div className="sq-container py-16 md:py-20">
        <div className="grid gap-12 border-b border-white/15 pb-14 lg:grid-cols-[1.35fr_2fr]">
          <div className="max-w-sm">
            <img src={logoReverse} alt="sidequests" className="mb-6 h-auto w-[168px]" />
            <p className="text-lg leading-relaxed text-white/68">
              A reason to take the side street, try the unfamiliar door, and remember the place you found.
            </p>
            <a
              href="mailto:hello@miamisidequests.io"
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[hsl(var(--gold-500))] hover:text-white"
            >
              <Mail className="h-4 w-4" />
              hello@miamisidequests.io
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2 className="sq-overline mb-4 text-white/45">{group.title}</h2>
                <ul className="space-y-1">
                  {group.links.map(([label, href]) => (
                    <li key={href}>
                      <Link to={href} className="inline-flex min-h-10 items-center text-sm font-medium text-white/72 hover:text-white">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 sidequests. Built for curious people in Miami.</p>
          <Link to="/partnerships" className="inline-flex items-center gap-1 font-bold text-white/72 hover:text-white">
            Turn your place into a quest <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
