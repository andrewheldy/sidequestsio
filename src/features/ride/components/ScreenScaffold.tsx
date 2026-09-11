import type { ReactNode } from 'react'

/**
 * Standard module-screen layout: fixed header, content scrolls inside a
 * clearly bounded area (the page itself never scrolls).
 */
export function ScreenScaffold({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      {header}
      <main className="min-h-0 flex-1 overflow-y-auto rounded-2xl">{children}</main>
    </div>
  )
}
