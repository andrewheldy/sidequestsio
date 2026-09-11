import { sponsorshipLabels } from '../brand'

interface SponsorLabelProps {
  labelKey: keyof typeof sponsorshipLabels
  /** Fictional advertisers additionally disclose demo status. */
  showDemoDisclosure?: boolean
}

/**
 * Approved sponsorship disclosure. Every sponsored surface renders this —
 * visible label first, optional "Demo sponsored placement" fine print.
 */
export function SponsorLabel({ labelKey, showDemoDisclosure = true }: SponsorLabelProps) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="rounded-md border border-border-strong px-2 py-0.5 text-[11px] font-semibold tracking-[0.14em] text-static-gray uppercase">
        {sponsorshipLabels[labelKey]}
      </span>
      {showDemoDisclosure ? (
        <span className="text-[11px] text-static-gray/80">{sponsorshipLabels.demoPlacement}</span>
      ) : null}
    </span>
  )
}
