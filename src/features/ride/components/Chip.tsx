interface ChipProps {
  label: string
  selected: boolean
  onSelect: () => void
}

/** Category filter chip — selected state is Pulse Lime on black. */
export function Chip({ label, selected, onSelect }: ChipProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`min-h-11 cursor-pointer rounded-full px-5 text-[15px] font-semibold whitespace-nowrap transition-colors duration-150 ${
        selected
          ? 'bg-pulse-lime text-feed-black'
          : 'border border-border-thin text-static-gray hover:border-border-strong hover:text-signal-white'
      }`}
    >
      {label}
    </button>
  )
}

interface ChipRowProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

export function ChipRow<T extends string>({ options, value, onChange, ariaLabel }: ChipRowProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex items-center gap-2 overflow-x-auto py-0.5"
    >
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onSelect={() => onChange(o.value)} />
      ))}
    </div>
  )
}
