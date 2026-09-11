import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { IconButton } from './Button.tsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: ReactNode
  /** Max width utility class for the dialog. */
  widthClass?: string
  testId?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal: focus is moved in on open and restored on close, Tab
 * cycles inside, Escape and backdrop close. Content entrance uses the shared
 * reduced-motion-aware animations.
 */
export function Modal({ open, onClose, labelledBy, children, widthClass = 'max-w-3xl', testId }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => restoreRef.current?.focus?.()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-scrim p-6 backdrop-blur-sm"
      onClick={onClose}
      data-testid={testId}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`anim-fade-up relative max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-border-thin bg-carbon shadow-2xl shadow-black/60 ${widthClass}`}
      >
        <div className="absolute top-3 right-3 z-10">
          <IconButton icon="close" label="Close" onClick={onClose} data-testid="modal-close" />
        </div>
        {children}
      </div>
    </div>
  )
}
