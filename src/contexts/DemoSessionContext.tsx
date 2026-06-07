import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { isDemoMode } from '@/lib/demo';

const STORAGE_KEY = 'sq_demo_signed_in';

interface DemoSessionValue {
  isDemoSignedIn: boolean;
  toggle: () => void;
  setSignedIn: (v: boolean) => void;
}

const DemoSessionContext = createContext<DemoSessionValue>({
  isDemoSignedIn: false,
  toggle: () => {},
  setSignedIn: () => {},
});

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedInState] = useState(
    () => isDemoMode && localStorage.getItem(STORAGE_KEY) === 'true',
  );

  const setSignedIn = useCallback((v: boolean) => {
    setSignedInState(v);
    v ? localStorage.setItem(STORAGE_KEY, 'true') : localStorage.removeItem(STORAGE_KEY);
  }, []);

  const toggle = useCallback(() => {
    setSignedInState((prev) => {
      const next = !prev;
      next ? localStorage.setItem(STORAGE_KEY, 'true') : localStorage.removeItem(STORAGE_KEY);
      return next;
    });
  }, []);

  return (
    <DemoSessionContext.Provider value={{ isDemoSignedIn: isDemoMode && signedIn, toggle, setSignedIn }}>
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession() {
  return useContext(DemoSessionContext);
}
