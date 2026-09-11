import { useEffect } from 'react'
import { track } from './analytics.ts'
import { useSession } from './session.tsx'

/**
 * Module screens can be deep-linked (or reloaded); make sure an anonymous
 * session exists and record the module visit.
 */
export function useEnsureSession(module: string) {
  const { started, start } = useSession()
  useEffect(() => {
    if (!started) start()
    track('module_opened', { module, direct: !started })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
