import { backend } from '../../lib/config';
import { ErrorState } from './States';

/** Shown wherever live data is needed but the backend is missing or refused. */
export function SetupRequired() {
  return (
    <ErrorState
      title="Backend not configured"
      message={backend.status === 'ready' ? undefined : backend.message}
    />
  );
}
