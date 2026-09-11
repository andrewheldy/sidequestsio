import { useSession } from '../lib/session.tsx'
import { AttractScreen } from './AttractScreen.tsx'
import { HomeScreen } from './HomeScreen.tsx'

/** /ride — attract loop until the rider taps in, then Home. */
export function RideScreen() {
  const { started, start } = useSession()
  return started ? <HomeScreen /> : <AttractScreen onBegin={start} />
}
