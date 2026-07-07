import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

export default function CookiePreferences() {
  const { consent, updateConsent, acceptAll, acceptNecessaryOnly } = useCookieConsent();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SideQuests
        </Link>

        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">
            SideQuests
          </p>
          <h1 className="text-3xl font-bold mb-2">Cookie Preferences</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Choose what SideQuests is allowed to use in your browser. These choices are saved on
            this device only. See our{" "}
            <Link to="/cookies" className="underline underline-offset-2">
              Cookie Policy
            </Link>{" "}
            for what each category means.
          </p>
        </header>

        <div className="rounded-xl border border-border divide-y divide-border">
          <PreferenceRow
            label="Necessary"
            desc="Keeps you signed in and remembers your cookie choices. Always on — required for the Service to work."
            checked
            disabled
          />
          <PreferenceRow
            label="Analytics"
            desc="Would help us understand aggregate usage patterns. Not active today — no analytics tool is currently integrated."
            checked={consent.analytics}
            onChange={(v) => updateConsent({ analytics: v })}
          />
          <PreferenceRow
            label="Marketing"
            desc="Would support marketing measurement. Not active today — no marketing tool is currently integrated."
            checked={consent.marketing}
            onChange={(v) => updateConsent({ marketing: v })}
          />
          <PreferenceRow
            label="Preferences"
            desc="Would remember non-essential UI preferences beyond your language and session."
            checked={consent.preferences}
            onChange={(v) => updateConsent({ preferences: v })}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="flex-1 h-11" onClick={acceptNecessaryOnly}>
            Necessary only
          </Button>
          <Button className="flex-1 h-11" onClick={acceptAll}>
            Accept all
          </Button>
        </div>

        {consent.decidedAt && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Last updated {new Date(consent.decidedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

function PreferenceRow({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} className="shrink-0" />
    </div>
  );
}
