import type { NudgeCandidate } from '../storage/deviceStore';

// In-memory only: whether a discovery screen is visible right now, and the
// suggestion a geofence event produced while it was. A background task that
// runs without UI sees `visible = false`, which is correct.
let visible = false;
let suggestion: NudgeCandidate | null = null;
const listeners = new Set<(candidate: NudgeCandidate | null) => void>();

export function setDiscoveryVisible(next: boolean) {
  visible = next;
}

export function isDiscoveryVisible() {
  return visible;
}

export function showInAppSuggestion(candidate: NudgeCandidate | null) {
  suggestion = candidate;
  listeners.forEach((listener) => listener(candidate));
}

export function currentSuggestion() {
  return suggestion;
}

export function onSuggestion(listener: (candidate: NudgeCandidate | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
