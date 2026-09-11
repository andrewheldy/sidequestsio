/**
 * The signature attract-screen pulse: a long waveform path that drifts
 * continuously. Motion is CSS-driven so reduced-motion settings freeze it into
 * a clean static waveform.
 */
export function PulseWave({ className = '' }: { className?: string }) {
  // One waveform period, repeated twice so the dash animation can loop seamlessly.
  const period =
    'l6 0 4-10 5 20 4-34 5 48 4-38 5 24 4-12 5 6 6-2 6 0 5-4 4 8 5-16 4 26 5-40 4 30 5-18 4 8 5-4 6 2 6 0 4-6 5 12 4-22 5 34 4-26 5 14 4-6 5 2 6 0'
  const d = `M-10 60 ${period} ${period} ${period}`
  return (
    <svg
      viewBox="0 0 640 120"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Base waveform, always visible (this is the reduced-motion state too). */}
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.45}
      />
      {/* Bright signal segment sweeping along the waveform. */}
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: '110 530',
          animation: 'feed-pulse-draw 7s linear infinite',
        }}
      />
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.14}
        style={{ filter: 'blur(6px)' }}
      />
    </svg>
  )
}

/** Compact animated equalizer used as a "live" affordance. */
export function EqualizerGlyph({ size = 16, animated = true }: { size?: number; animated?: boolean }) {
  const bars = [0.5, 0.9, 0.65, 1, 0.45]
  return (
    <span
      className="inline-flex items-end gap-[2px]"
      style={{ height: size, width: size * 1.15 }}
      aria-hidden="true"
    >
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-current"
          style={{
            height: `${h * 100}%`,
            transformOrigin: 'bottom',
            animation: animated ? `feed-eq ${1.1 + i * 0.17}s ease-in-out ${i * 0.1}s infinite` : undefined,
          }}
        />
      ))}
    </span>
  )
}
