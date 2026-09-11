interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
  testId?: string
}

/** Switch row with a 48px touch target and visible on/off state. */
export function Toggle({ checked, onChange, label, description, testId }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-4 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/5"
    >
      <span>
        <span className="block text-base font-semibold text-signal-white">{label}</span>
        {description ? <span className="block text-sm text-static-gray">{description}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
          checked ? 'border-pulse-lime bg-pulse-lime' : 'border-border-strong bg-graphite'
        }`}
      >
        <span
          className={`absolute top-0.5 h-[22px] w-[22px] rounded-full transition-transform ${
            checked ? 'translate-x-[22px] bg-feed-black' : 'translate-x-0.5 bg-static-gray'
          }`}
        />
      </span>
    </button>
  )
}
