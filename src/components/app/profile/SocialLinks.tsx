import type { ReactNode } from 'react';
import { handleFromUrl } from '@/lib/profile';
import { cn } from '@/lib/utils';

interface SocialLinksProps {
  instagram?: string | null;
  tiktok?: string | null;
  x?: string | null;
  youtube?: string | null;
  snapchat?: string | null;
  className?: string;
}

/**
 * Clean, subtle social buttons — identity context, not clout. Only renders the
 * links a user actually added; each opens in a new tab with an accessible
 * label and a 44×44 tap target.
 */
export function SocialLinks({ instagram, tiktok, x, youtube, snapchat, className }: SocialLinksProps) {
  const allLinks: { url: string | null | undefined; label: string; icon: ReactNode }[] = [
    { url: instagram, label: 'Instagram', icon: <InstagramGlyph /> },
    { url: tiktok,    label: 'TikTok',    icon: <TikTokGlyph /> },
    { url: x,         label: 'X',         icon: <XGlyph /> },
    { url: youtube,   label: 'YouTube',   icon: <YouTubeGlyph /> },
    { url: snapchat,  label: 'Snapchat',  icon: <SnapchatGlyph /> },
  ];

  const present = allLinks.filter(
    (l): l is { url: string; label: string; icon: ReactNode } => Boolean(l.url),
  );

  if (present.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {present.map(({ url, label, icon }) => {
        const handle = handleFromUrl(url);
        return (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={handle ? `${label} — ${handle}` : label}
            title={handle ?? label}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-muted-foreground',
              'transition-colors hover:border-primary/50 hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            {icon}
          </a>
        );
      })}
    </div>
  );
}

// ── Subtle, monochrome brand glyphs (inherit currentColor) ──────────────────

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.3 1.9 1.4 3.3 3.5 3.6v2.4c-1.3.1-2.5-.3-3.5-1v5.7a5.3 5.3 0 1 1-5.3-5.3c.3 0 .5 0 .8.1v2.5a2.8 2.8 0 1 0 2 2.7V3h2.5Z" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M17.5 3h3l-7 8 8.2 10h-6.4l-5-6.1L7 21H4l7.4-8.5L3.5 3h6.5l4.5 5.6L17.5 3Zm-1.1 16h1.7L8.7 4.8H6.9L16.4 19Z" />
    </svg>
  );
}

function YouTubeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.3A2.7 2.7 0 0 0 2.4 7.2C2 9 2 12 2 12s0 3 .4 4.8a2.7 2.7 0 0 0 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9C22 15 22 12 22 12s0-3-.4-4.8ZM10 15V9l6 3-6 3Z" />
    </svg>
  );
}

function SnapchatGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.5 2 6.3 4.2 6.3 7v.8c-.4.1-.9.1-1.3.1-.4 0-.6.3-.6.6s.2.6.6.6c1 0 1.8-.2 2.4-.5.1.3.2.6.2.9C7.6 9.7 7 10 7 10s-.5.7-.5 1.3c0 .4.2.6.4.7-.1.4-.4.9-.7 1.2-.4.4-.8.6-1.2.7-.4.1-.6.3-.5.6.3.9 1.8 1.2 2.8 1.3.2.3.2.7.5.9.4.2.9.2 1.2.2.5 0 .9-.1 1.4-.3.5.2 1 .3 1.6.3.3 0 .8 0 1.2-.2.3-.2.3-.6.5-.9 1-.1 2.5-.4 2.8-1.3.1-.3-.1-.5-.5-.6-.4-.1-.8-.3-1.2-.7-.3-.3-.6-.8-.7-1.2.2-.1.4-.3.4-.7 0-.6-.5-1.3-.5-1.3s-.6-.3-.6-.5c0-.3.1-.6.2-.9.6.3 1.4.5 2.4.5.4 0 .6-.3.6-.6s-.2-.6-.6-.6c-.4 0-.9 0-1.3-.1V7C17.7 4.2 15.5 2 12 2Z" />
    </svg>
  );
}

export default SocialLinks;
