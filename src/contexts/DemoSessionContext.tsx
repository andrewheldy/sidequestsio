import { createContext, useContext, useState, type ReactNode } from 'react';
import { isDemoMode } from '@/lib/demo';

const STORAGE_KEY = 'sq_demo_signed_in';

interface DemoSessionValue {
  isDemoSignedIn: boolean;
  toggle: () => void;
}

const DemoSessionContext = createContext<DemoSessionValue>({
  isDemoSignedIn: false,
  toggle: () => {},
});

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(
    () => isDemoMode && localStorage.getItem(STORAGE_KEY) === 'true',
  );

  const toggle = () => {
    setSignedIn((prev) => {
      const next = !prev;
      next ? localStorage.setItem(STORAGE_KEY, 'true') : localStorage.removeItem(STORAGE_KEY);
      return next;
    });
  };

  return (
    <DemoSessionContext.Provider value={{ isDemoSignedIn: isDemoMode && signedIn, toggle }}>
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession() {
  return useContext(DemoSessionContext);
}
