import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Mail, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { activeBackend } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { email: "quester@sidequests.io", label: "Demo Quester", role: "user" },
  { email: "partner@wynwood.example", label: "Demo Partner", role: "partner" },
  { email: "admin@sidequests.io", label: "Demo Admin", role: "admin" },
];

export default function Auth() {
  const { signInWithEmail, signInWithProvider, isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const next = params.get("next") || "/app";
  const isLocal = activeBackend() === "local";

  useEffect(() => {
    if (isAuthenticated) navigate(decodeURIComponent(next), { replace: true });
  }, [isAuthenticated, navigate, next]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await signInWithEmail(email);
      if (isLocal) {
        toast.success("Signed in");
      } else {
        toast.success("Magic link sent — check your email.");
      }
    } catch {
      toast.error("Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = async (demoEmail: string) => {
    setBusy(true);
    try {
      await signInWithEmail(demoEmail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <Link to="/" className="mb-8 text-center">
          <span className="font-poppins text-3xl font-extrabold italic text-gradient-coral">
            SIDEQUESTS
          </span>
        </Link>

        <div className="glass-card p-6">
          <h1 className="font-poppins text-2xl font-bold text-foreground">
            Sign in to continue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Save your progress, earn points, and unlock rewards.
          </p>

          <form onSubmit={handleEmail} className="mt-6 space-y-3">
            <Input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-muted/50"
            />
            <Button type="submit" disabled={busy} className="w-full gap-2">
              <Mail className="h-4 w-4" />
              {isLocal ? "Continue with email" : "Email me a magic link"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => signInWithProvider("google")}
            >
              Continue with Google
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => signInWithProvider("apple")}
            >
              Continue with Apple
            </Button>
          </div>
        </div>

        {isLocal && (
          <div className="mt-6">
            <p className="mb-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Demo accounts (local mode)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => handleDemo(a.email)}
                  disabled={busy}
                  className="rounded-lg border border-border bg-card/50 px-2 py-2 text-xs text-foreground hover:border-primary"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms &amp; Privacy Policy.
        </p>
      </div>
    </div>
  );
}
