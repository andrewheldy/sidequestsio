import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import type { IconName } from './Icon.tsx'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: IconName
  iconAfter?: IconName
  size?: 'md' | 'lg'
  children?: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-pulse-lime text-feed-black font-semibold hover:brightness-105 active:brightness-95 disabled:opacity-40',
  secondary:
    'border border-border-strong text-signal-white font-semibold hover:border-pulse-lime hover:text-pulse-lime active:bg-lime-soft disabled:opacity-40',
  ghost:
    'text-static-gray hover:text-signal-white hover:bg-white/5 active:bg-white/10 disabled:opacity-40',
}

/**
 * Touch-first button: minimum 48px hit area, visible focus ring, no hover-only
 * affordances (hover only enhances).
 */
export function Button({
  variant = 'secondary',
  icon,
  iconAfter,
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const sizing = size === 'lg' ? 'min-h-14 px-7 text-lg' : 'min-h-12 px-5 text-base'
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-xl transition-colors duration-150 ${sizing} ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === 'lg' ? 22 : 20} /> : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} size={size === 'lg' ? 22 : 20} /> : null}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  active?: boolean
  caption?: string
}

/** Square icon control with an always-visible caption option (header controls). */
export function IconButton({
  icon,
  label,
  active = false,
  caption,
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={rest['aria-haspopup'] ? undefined : active || undefined}
      className={`inline-flex min-h-12 min-w-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-2 transition-colors duration-150 ${
        active
          ? 'bg-lime-soft text-pulse-lime'
          : 'text-static-gray hover:bg-white/5 hover:text-signal-white active:bg-white/10'
      } ${className}`}
      {...rest}
    >
      <Icon name={icon} size={21} />
      {caption ? (
        <span className="text-[10px] leading-none font-medium tracking-[0.14em] uppercase">
          {caption}
        </span>
      ) : null}
    </button>
  )
}
