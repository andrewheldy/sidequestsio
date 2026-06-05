import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Favorites are persisted in localStorage, namespaced per signed-in user
 * (or `guest`). Saving requires sign-in per the app state rules — the UI gates
 * the toggle behind the sign-in prompt — but storage itself stays local so the
 * MVP needs no quests/favorites backend table.
 */

interface FavoritesContextValue {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

const keyFor = (userId: string | null) => `sq_favorites_${userId ?? 'guest'}`;

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites whenever the active user changes.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(keyFor(user?.id ?? null));
      setFavorites(raw ? JSON.parse(raw) : []);
    } catch {
      setFavorites([]);
    }
  }, [user?.id]);

  const persist = useCallback(
    (next: string[]) => {
      setFavorites(next);
      try {
        localStorage.setItem(keyFor(user?.id ?? null), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [user?.id],
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const toggleFavorite = useCallback(
    (id: string) => {
      persist(
        favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id],
      );
    },
    [favorites, persist],
  );

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}
