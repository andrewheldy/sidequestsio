import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Global "create an account to continue" prompt. Components call
 * `promptSignIn('save favorites')` when a signed-out user tries to start a
 * quest, save a favorite or claim a reward — the conversion moments.
 */

interface SignInPromptContextValue {
  promptSignIn: (reason?: string) => void;
}

const SignInPromptContext = createContext<SignInPromptContextValue | undefined>(undefined);

export function SignInPromptProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();

  const promptSignIn = useCallback((why?: string) => {
    setReason(why);
    setOpen(true);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <SignInPromptContext.Provider value={{ promptSignIn }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center font-poppins text-xl">
              Create your explorer profile
            </DialogTitle>
            <DialogDescription className="text-center">
              {reason
                ? `Sign in to ${reason} and keep your progress across the city.`
                : 'Sign in to save your progress, rewards and favorites.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button className="w-full" onClick={() => go('/onboarding')}>
              Start the adventure
            </Button>
            <Button variant="outline" className="w-full" onClick={() => go('/auth')}>
              I already have an account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SignInPromptContext.Provider>
  );
}

export function useSignInPrompt() {
  const ctx = useContext(SignInPromptContext);
  if (!ctx) throw new Error('useSignInPrompt must be used within a SignInPromptProvider');
  return ctx;
}
