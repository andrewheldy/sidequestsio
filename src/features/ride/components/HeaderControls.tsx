import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { demoDisclosure, product } from '../brand'
import { usePrefs } from '../lib/prefs.tsx'
import { useSession } from '../lib/session.tsx'
import { IconButton } from './Button.tsx'
import { Toggle } from './Toggle.tsx'

type PanelKey = 'volume' | 'a11y' | 'settings'

function Panel({ title, children, testId }: { title: string; children: ReactNode; testId: string }) {
  return (
    <div
      className="anim-fade-up absolute top-full right-0 z-40 mt-2 w-80 rounded-2xl border border-border-thin bg-carbon p-4 shadow-2xl shadow-black/60"
      role="group"
      aria-label={title}
      data-testid={testId}
    >
      <p className="px-2 pb-2 text-[13px] font-semibold tracking-[0.16em] text-static-gray uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

/**
 * Shared header control cluster: volume, accessibility, and settings panels.
 * All three are functional prototype controls (volume affects the simulated
 * player only — the prototype never plays audio).
 */
export function HeaderControls({ captions = true }: { captions?: boolean }) {
  const [open, setOpen] = useState<PanelKey | null>(null)
  const { prefs, setPref } = usePrefs()
  const session = useSession()

  const toggle = (key: PanelKey) => setOpen((prev) => (prev === key ? null : key))

  // Panels are dismissible with Escape as well as by tapping outside.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="relative flex items-center gap-1">
      {open ? (
        <button
          type="button"
          aria-label="Close panel"
          className="fixed inset-0 z-30 cursor-default"
          onClick={() => setOpen(null)}
        />
      ) : null}

      <IconButton
        icon={prefs.volume === 0 ? 'volumeMuted' : 'volume'}
        label="Volume"
        caption={captions ? 'Volume' : undefined}
        active={open === 'volume'}
        aria-haspopup="true"
        aria-expanded={open === 'volume'}
        onClick={() => toggle('volume')}
        data-testid="control-volume"
      />
      <IconButton
        icon="accessibility"
        label="Accessibility options"
        caption={captions ? 'Access' : undefined}
        active={open === 'a11y'}
        aria-haspopup="true"
        aria-expanded={open === 'a11y'}
        onClick={() => toggle('a11y')}
        data-testid="control-a11y"
      />
      <IconButton
        icon="sliders"
        label="Settings"
        caption={captions ? 'Settings' : undefined}
        active={open === 'settings'}
        aria-haspopup="true"
        aria-expanded={open === 'settings'}
        onClick={() => toggle('settings')}
        data-testid="control-settings"
      />

      {open === 'volume' ? (
        <Panel title="Volume" testId="panel-volume">
          <div className="flex items-center gap-3 px-2 py-2">
            <input
              type="range"
              min={0}
              max={100}
              value={prefs.volume}
              onChange={(e) => setPref('volume', Number(e.target.value))}
              aria-label="Volume level"
              className="h-12 w-full accent-(--feed-pulse-lime)"
              data-testid="volume-slider"
            />
            <span className="w-10 text-right text-base font-semibold text-signal-white" data-testid="volume-value">
              {prefs.volume}
            </span>
          </div>
          <p className="px-2 pb-1 text-sm text-static-gray">
            Applies to the on-screen player. This demo never autoplays audio.
          </p>
        </Panel>
      ) : null}

      {open === 'a11y' ? (
        <Panel title="Accessibility" testId="panel-a11y">
          <div className="flex flex-col gap-1">
            <Toggle
              label="Larger text"
              description="Bump up type across the screen"
              checked={prefs.largerText}
              onChange={(v) => setPref('largerText', v)}
              testId="toggle-larger-text"
            />
            <Toggle
              label="Reduce motion"
              description="Pause ambient animation"
              checked={prefs.reducedMotion}
              onChange={(v) => setPref('reducedMotion', v)}
              testId="toggle-reduced-motion"
            />
            <Toggle
              label="High contrast"
              description="Brighter text and borders"
              checked={prefs.highContrast}
              onChange={(v) => setPref('highContrast', v)}
              testId="toggle-high-contrast"
            />
          </div>
        </Panel>
      ) : null}

      {open === 'settings' ? (
        <Panel title="Settings" testId="panel-settings">
          <div className="flex flex-col gap-2 px-2 pb-1">
            <div className="flex min-h-12 items-center justify-between gap-4">
              <span className="text-base font-semibold text-signal-white">Language</span>
              <span className="text-sm text-static-gray">English · Español coming soon</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(null)
                session.sleep()
              }}
              className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl px-0 text-left transition-colors hover:bg-white/5"
              data-testid="sleep-button"
            >
              <span className="text-base font-semibold text-signal-white">Sleep screen</span>
              <span className="text-sm text-static-gray">Darken until tapped</span>
            </button>
            <p className="border-t border-border-thin pt-3 text-sm text-static-gray">
              {product.name} prototype. {demoDisclosure.contentNote}
            </p>
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
