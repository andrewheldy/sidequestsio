import type { ReactNode } from 'react';
import { handleFromUrl } from '@/lib/profile';
import { cn } from '@/lib/utils';

interface SocialLinksProps {
  instagram?: string | null;
  tiktok?: string | null;
  x?: string | null;
  className?: string;
}

/**
 * Clean, subtle social buttons — identity context, not clout. Only renders the
 * links a user actually added; each opens in a new tab with an accessible
 * label and a 44×44 tap target.
 */
export function SocialLinks({ instagram, tiktok, x, className }: SocialLinksProps) {
  const links: { url: string | null | undefined; label: string; icon: ReactNode }[] = [
    { url: instagram, label: 'Instagram', icon: <InstagramGlyph /> },
    { url: tiktok, label: 'TikTok', icon: <TikTokGlyph /> },
    { url: x, label: 'X', icon: <XGlyph /> },
  ];
  const present = links.filter(
    (l): l is { url: string; label: string; icon: ReactNode } => Boolean(l.url),
  );

  if (present.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
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

// Subtle, monochrome brand glyphs (inherit currentColor). Kept inline so we
// don't depend on an icon set shipping brand marks.

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

export default SocialLinks;
