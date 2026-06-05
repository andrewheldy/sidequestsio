import { useState } from 'react';
import { Navigation, Loader2, NavigationOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type LocationState = 'idle' | 'loading' | 'success' | 'denied' | 'unavailable';

interface UserLocationButtonProps {
  onLocation: (coords: { lat: number; lng: number }) => void;
  onError?: (message: string) => void;
}

/**
 * Requests geolocation only when the user explicitly taps — never on page load.
 * Location data is never stored or sent to any server; used only for local
 * distance calculations and map centering.
 */
const UserLocationButton = ({ onLocation, onError }: UserLocationButtonProps) => {
  const [state, setState] = useState<LocationState>('idle');

  const handleClick = () => {
    if (state === 'loading') return;

    if (state === 'denied') {
      onError?.('Location access was denied. Enable it in your browser settings to see distances.');
      return;
    }

    if (!navigator.geolocation) {
      setState('unavailable');
      onError?.('Location is not supported on this device.');
      return;
    }

    setState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState('success');
        onLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        if (err.code === 1 /* PERMISSION_DENIED */) {
          setState('denied');
          onError?.('Location access denied. You can enable it in your browser settings.');
        } else {
          setState('idle');
          onError?.("Couldn't get your location. Please try again.");
        }
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const isActive = state === 'success';
  const isDenied = state === 'denied' || state === 'unavailable';

  return (
    <button
      onClick={handleClick}
      aria-label={
        isActive
          ? 'Your location is active'
          : isDenied
            ? 'Location access denied'
            : 'Show my location on map'
      }
      title={
        isActive
          ? 'Location active'
          : isDenied
            ? 'Location access denied — tap for help'
            : 'Show my location'
      }
      className={cn(
        'flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border shadow-lg transition-all',
        isActive
          ? 'border-blue-400/60 bg-blue-500 text-white'
          : isDenied
            ? 'border-border/60 bg-card/80 text-muted-foreground backdrop-blur-md'
            : 'border-border/60 bg-card/80 text-foreground backdrop-blur-md hover:bg-card active:scale-95',
      )}
    >
      {state === 'loading' ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isDenied ? (
        <NavigationOff className="h-5 w-5" />
      ) : (
        <Navigation className={cn('h-5 w-5', isActive && 'fill-white')} />
      )}
    </button>
  );
};

export default UserLocationButton;
