/**
 * The single place the sidequests logo enters the app.
 *
 * Two treatments, per brand/README.md:
 *   <Logo />     full lockup — mark + wordmark. Headers, footers, branded screens.
 *   <LogoMark /> symbol only — favicons-in-UI, avatars, compact nav, map pins.
 *
 * Both are rendered as <img> from the vector sources in `brand/logos/`, so the
 * artwork is never recreated in markup. Width is the only dimension callers set;
 * height follows the artwork's own ratio so the logo can't be squashed.
 */
import { cn } from '@/lib/utils';
import logoPrimary from '../../../brand/logos/logo-horizontal.svg';
import logoReverse from '../../../brand/logos/logo-reverse.svg';
import markPrimary from '../../../brand/logos/icon.svg';
import markReverse from '../../../brand/logos/icon-reverse.svg';

type Tone = 'default' | 'reverse';

interface LogoProps {
  /** `reverse` is the white treatment for Midnight Navy and photographic surfaces. */
  tone?: Tone;
  className?: string;
  /**
   * Decorative when the logo sits inside an already-labelled link. The wrapping
   * link keeps its own accessible name, so repeating it here would double up.
   */
  decorative?: boolean;
}

export function Logo({ tone = 'default', className, decorative = false }: LogoProps) {
  return (
    <img
      src={tone === 'reverse' ? logoReverse : logoPrimary}
      alt={decorative ? '' : 'sidequests'}
      aria-hidden={decorative || undefined}
      // `h-auto` keeps the lockup's aspect ratio no matter what width a caller sets.
      className={cn('h-auto w-[150px]', className)}
    />
  );
}

export function LogoMark({ tone = 'default', className, decorative = false }: LogoProps) {
  return (
    <img
      src={tone === 'reverse' ? markReverse : markPrimary}
      alt={decorative ? '' : 'sidequests'}
      aria-hidden={decorative || undefined}
      className={cn('h-auto w-8', className)}
    />
  );
}

export default Logo;
