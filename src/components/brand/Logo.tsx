/**
 * The single place the sidequests logo enters the app.
 *
 * Two treatments, per brand/logos/README.md:
 *   <Logo />     full lockup — mark + wordmark. Headers, footers, branded screens.
 *   <LogoMark /> symbol only — favicons-in-UI, avatars, compact nav, map pins.
 *
 * Both render as <img> from the vector sources in `brand/logos/`, so the artwork
 * is never recreated in markup.
 *
 * The lockup is composed here rather than taken from `logo-horizontal.svg`.
 * That file fixes the mark at ~15% of the lockup's width, so rendering it at a
 * header-sized 150px left the mark ~23px tall — below the 32px the kit's README
 * says `icon.svg` is drawn for, which is why it read as a blob. Sizing mark and
 * wordmark separately lets the mark clear that floor without the wordmark
 * growing to match. `logo-horizontal.svg` remains the canonical signature for
 * export and print; this is the on-screen arrangement.
 */
import { cn } from '@/lib/utils';
import markPrimary from '../../../brand/logos/icon.svg';
import markReverse from '../../../brand/logos/icon-reverse.svg';
import wordmarkPrimary from '../../../brand/logos/wordmark.svg';
import wordmarkReverse from '../../../brand/logos/wordmark-reverse.svg';

type Tone = 'default' | 'reverse';
type Size = 'sm' | 'md' | 'lg';

/**
 * Heights of the two <img> boxes, in px, and the space between them.
 *
 * These are box heights, not ink heights: both files carry padding inside their
 * viewBox, so the artwork comes out shorter than the box. `icon.svg` is 54 ink
 * units of 64 and `wordmark.svg` 155 of 210, which puts `md`'s mark ink at 32px
 * — exactly the size the kit draws it for.
 *
 * `sm` lands the mark ink at ~28px, under that 32px floor. It is the one step
 * that has to fit beside the app header's bell and avatar on a 320px phone, and
 * 28px still resolves the switchbacks where the old 20px did not. The kit's
 * answer below 32px is `icon-small.svg`, which can't be used here: it paints
 * with `currentColor`, and an <img> has no text colour to inherit, so the
 * reverse tone would come out black.
 *
 * The wordmark stays at 0.74× the mark's box across all three steps. That keeps
 * the mark's wall about 11% heavier than the wordmark's stroke at every size:
 * the cost of giving the mark its own scale, and small enough to read as
 * deliberate rather than mismatched. Sizing the wordmark for equal weight would
 * mean the wide lockup this arrangement exists to avoid.
 */
const SIZES: Record<Size, { mark: number; wordmark: number; gap: number }> = {
  sm: { mark: 33, wordmark: 24, gap: 8 },
  md: { mark: 38, wordmark: 28, gap: 8 },
  lg: { mark: 46, wordmark: 34, gap: 10 },
};

interface LogoProps {
  /** `reverse` is the white treatment for Midnight Navy and photographic surfaces. */
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
      <img src={reverse ? markReverse : markPrimary} alt="" style={{ height: `${mark}px` }} className="w-auto" />
      <img src={reverse ? wordmarkReverse : wordmarkPrimary} alt="" style={{ height: `${wordmark}px` }} className="w-auto" />
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
