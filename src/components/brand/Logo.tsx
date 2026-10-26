/**
 * The single place the sidequests logo enters the app.
 *
 * Two treatments, per brand/logos/README.md:
 *   <Logo />     full lockup — mark + wordmark. Headers, footers, branded screens.
 *   <LogoMark /> symbol only — favicons-in-UI, avatars, compact nav, map pins.
 *
 * The SVG wordmark preserves the approved custom lettering. The mark embeds
 * the approved ivory/gold artwork; its default navy tile provides contrast on
 * light surfaces. Separate sizing keeps both legible in narrow app headers.
 */
import { cn } from '@/lib/utils';
import markPrimary from '../../../brand/logos/icon.svg';
import markReverse from '../../../brand/logos/icon-reverse.svg';
import wordmarkPrimary from '../../../brand/logos/wordmark.svg';
import wordmarkReverse from '../../../brand/logos/wordmark-reverse.svg';

type Tone = 'default' | 'reverse';
type Size = 'sm' | 'md' | 'lg';

/** Box heights and gap in pixels. The new wordmark is tightly cropped. */
const SIZES: Record<Size, { mark: number; wordmark: number; gap: number }> = {
  sm: { mark: 33, wordmark: 20, gap: 8 },
  md: { mark: 38, wordmark: 24, gap: 8 },
  lg: { mark: 46, wordmark: 30, gap: 10 },
};

interface LogoProps {
  /** `reverse` uses ivory lettering and a transparent mark on dark surfaces. */
  tone?: Tone;
  /** `sm` for app chrome, which is tight on narrow phones; `lg` for footers and branded screens. */
  size?: Size;
  className?: string;
  /**
   * Decorative when the logo sits inside an already-labelled link. The wrapping
   * link keeps its own accessible name, so repeating it here would double up.
   */
  decorative?: boolean;
}

export function Logo({ tone = 'default', size = 'md', className, decorative = false }: LogoProps) {
  const { mark, wordmark, gap } = SIZES[size];
  const reverse = tone === 'reverse';

  return (
    <span
      className={cn('inline-flex shrink-0 items-center', className)}
      style={{ gap: `${gap}px` }}
      // One name for the pair: the mark and wordmark are one logo, not two images.
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'sidequests'}
      aria-hidden={decorative || undefined}
    >
      <img src={reverse ? markReverse : markPrimary} alt="" width={mark} height={mark} className="shrink-0" />
      <img src={reverse ? wordmarkReverse : wordmarkPrimary} alt="" width={wordmark * 1091 / 200} height={wordmark} className="shrink-0" />
    </span>
  );
}

export function LogoMark({ tone = 'default', className, decorative = false }: Omit<LogoProps, 'size'>) {
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
