import type { SVGProps } from 'react'

/**
 * Minimal inline icon set — consistent 24×24 stroke style, sized for
 * arm's-length viewing. All icons are decorative by default (aria-hidden);
 * interactive parents supply accessible labels.
 */
const STROKE_PATHS: Record<string, string> = {
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  arrowUpRight: 'M7 17 17 7M9 7h8v8',
  check: 'M5 13l4.5 4.5L19 7',
  close: 'M6 6l12 12M18 6 6 18',
  volume: 'M11 5 6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18 6a9 9 0 0 1 0 12',
  volumeMuted: 'M11 5 6 9H3v6h3l5 4V5zM16 9.5l5 5M21 9.5l-5 5',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  cloud: 'M17.5 18a4.3 4.3 0 0 0 .5-8.6A6 6 0 0 0 6.2 10.7 3.8 3.8 0 0 0 7.2 18z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z',
  musicNote: 'M9 18V5l10-2v13M9 18a2.2 2.2 0 1 1-4.4 0A2.2 2.2 0 0 1 9 18zM19 16a2.2 2.2 0 1 1-4.4 0 2.2 2.2 0 0 1 4.4 0z',
  sparkle:
    'M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM17 17h3v3h-3z',
  phone: 'M8 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 8 3zM11 17.5h2',
  bookmark: 'M7 4h10a1 1 0 0 1 1 1v15l-6-3.5L6 20V5a1 1 0 0 1 1-1z',
  headphones:
    'M4 14v-1a8 8 0 0 1 16 0v1M4 15a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2v-3zM20 15a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2v-3z',
  lightning: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z',
  question:
    'M9.3 9.2A2.8 2.8 0 1 1 13 11.9c-.8.4-1 .9-1 1.9M12 17.2h.01M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z',
  camera:
    'M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  buildings: 'M4 20V8h5v12M9 20V4h6v16M15 20v-9h5v9M3 20h18M6.5 11h.01M6.5 14h.01M11.5 8h.01M11.5 12h.01M17.5 14h.01M17.5 17h.01',
  pin: 'M12 21S5.5 15.8 5.5 11a6.5 6.5 0 0 1 13 0C18.5 15.8 12 21 12 21zM14.3 11a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0z',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  flame:
    'M12 3c.5 3-3.5 4.6-3.5 8.5a3.5 3.5 0 0 0 7 .3c1 .8 1.5 2 1.5 3.2a5 5 0 0 1-10 0C7 10.5 12 8.5 12 3zM12 21a5 5 0 0 0 5-5',
  trophy:
    'M7 4h10v3.5a5 5 0 0 1-10 0V4zM7 5H4.5A2.5 2.5 0 0 0 7 9.7M17 5h2.5A2.5 2.5 0 0 1 17 9.7M12 12.5V16M8.5 19.5h7M10 16h4v3.5h-4z',
  globe:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM3.5 12h17M12 3.2c2.7 2.9 2.7 14.7 0 17.6M12 3.2c-2.7 2.9-2.7 14.7 0 17.6',
  controller:
    'M6.5 8.5h11a4 4 0 0 1 4 4.3l-.5 2.9a2.8 2.8 0 0 1-5 1.2L14.7 15.5H9.3L8 16.9a2.8 2.8 0 0 1-5-1.2l-.5-2.9a4 4 0 0 1 4-4.3zM8 11v3M6.5 12.5h3M15.7 11.5h.01M17.7 13.5h.01',
  car: 'M5.5 16l1.3-4a2 2 0 0 1 1.9-1.4h6.6a2 2 0 0 1 1.9 1.4l1.3 4M4.5 16h15a1 1 0 0 1 1 1v2.5h-2.5M4.5 16a1 1 0 0 0-1 1v2.5H6M6 19.5h12',
  accessibility: 'M12 6.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM4.5 9h15M12 9v5.5M12 14.5 8 21M12 14.5l4 6.5',
  sliders: 'M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1M15 5v4M9 10v4M17 15v4',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  route: 'M5 19a2 2 0 1 1 .01 0zM19 5a2 2 0 1 1 .01 0zM6.5 17.5C10 14 8 10 11 8.5c2.2-1.1 4.5-.5 6.5-2.5',
}

const FILL_PATHS: Record<string, string> = {
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h3.4v14H7zM13.6 5H17v14h-3.4z',
  next: 'M6 5v14l8.5-7zM16.5 5h2.6v14h-2.6z',
  prev: 'M18 5v14l-8.5-7zM4.9 5h2.6v14H4.9z',
}

export type IconName = keyof typeof STROKE_PATHS | keyof typeof FILL_PATHS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 22, ...rest }: IconProps) {
  const fillPath = FILL_PATHS[name]
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {fillPath ? (
        <path d={fillPath} fill="currentColor" />
      ) : (
        <path
          d={STROKE_PATHS[name]}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
