import { product } from '../brand'

/**
 * Temporary Pulse mark per the locked identity: five vertical rounded bars in
 * Pulse Lime, paired with the bold THE FEED wordmark. Not a new logo concept.
 */
export function PulseMark({ size = 28 }: { size?: number }) {
  const bars = [
    { x: 1, y: 9, h: 8 },
    { x: 6.5, y: 5, h: 16 },
    { x: 12, y: 1, h: 24 },
    { x: 17.5, y: 6, h: 14 },
    { x: 23, y: 10, h: 6 },
  ]
  return (
    <svg
      viewBox="0 0 27 26"
      width={size}
      height={(size * 26) / 27}
      aria-hidden="true"
      focusable="false"
    >
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={3} height={b.h} rx={1.5} fill="currentColor" />
      ))}
    </svg>
  )
}

interface FeedLogoProps {
  variant?: 'horizontal' | 'stacked'
  /** Wordmark cap height driver (px font size). */
  size?: number
}

export function FeedLogo({ variant = 'horizontal', size = 22 }: FeedLogoProps) {
  const wordmark =
    variant === 'stacked' ? (
      <span
        className="font-display leading-[0.9] font-bold tracking-tight text-signal-white uppercase"
        style={{ fontSize: size }}
      >
        THE
        <br />
        FEED
      </span>
    ) : (
      <span
        className="font-display leading-none font-bold tracking-tight text-signal-white uppercase"
        style={{ fontSize: size }}
      >
        {product.name}
      </span>
    )

  return (
    <span className="inline-flex items-center gap-2.5" data-testid="feed-logo">
      <span className="text-pulse-lime">
        <PulseMark size={variant === 'stacked' ? size * 1.6 : size * 1.15} />
      </span>
      {wordmark}
    </span>
  )
}
