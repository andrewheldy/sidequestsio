import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { SectionHeader } from "@/components/app/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRepository } from "@/lib/db";
import { SocialLinksEditor } from "@/components/app/profile/SocialLinksEditor";
import type { PrivacyPreferences } from "@/types/db";
import { toast } from "sonner";

export default function Settings() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    display_name: profile?.display_name ?? "",
    username: profile?.username ?? "",
    phone_number: profile?.phone_number ?? "",
  });

  const [saving, setSaving] = useState(false);

  const {
    data: privacy,
    isLoading: privacyLoading,
    isError: privacyError,
  } = useQuery({
    queryKey: ["privacy", user?.id],
    queryFn: async () => (await getRepository()).getPrivacy(user!.id),
    enabled: !!user,
  });

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const save = async () => {
    setSaving(true);
    const { error } = await updateProfile({
      display_name: form.display_name || null,
      username: form.username || null,
      phone_number: form.phone_number || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Settings saved");
    }
  };

  const cancel = () => navigate("/app/profile");

  const updatePrivacy = async (patch: Partial<PrivacyPreferences>) => {
    if (!user) return;
    const repo = await getRepository();
    await repo.updatePrivacy(user.id, patch);
    qc.invalidateQueries({ queryKey: ["privacy", user.id] });
    toast.success("Privacy settings updated");
  };

  return (
    <AppLayout title="Settings">
      <div className="space-y-6 pb-4">
        <Button
          variant="ghost"
          onClick={cancel}
          className="gap-2 pl-0 -ml-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Button>

        {/* Account section */}
        <section>
          <SectionHeader title="Account" />
          <div className="glass-card space-y-4 p-4">
            <FieldRow
              label="Email"
              value={user?.email ?? ""}
              disabled
              hint="Contact support to change your email."
            />
            <FieldRow
              label="Display name"
              value={form.display_name}
              onChange={set("display_name")}
              placeholder="Your public name"
            />
            <FieldRow
              label="Username"
              value={form.username}
              onChange={set("username")}
              placeholder="@yourhandle"
            />
            <FieldRow
              label="Phone number"
              value={form.phone_number}
              onChange={set("phone_number")}
              type="tel"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </section>

        {/* Save / Cancel */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={cancel}
            className="flex-1 h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="flex-1 h-11 gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

        {/* Social Identity */}
        <section>
          <SectionHeader title="Social Identity" />
          <SocialLinksEditor
            instagram_handle={profile?.instagram_handle}
            tiktok_handle={profile?.tiktok_handle}
            x_handle={profile?.x_handle}
          />
        </section>

        {/* Privacy & Consent — hidden when unavailable */}
        {!privacyError && (
          <section>
            <SectionHeader title="Privacy & Consent" />
            {privacyLoading ? (
              <div className="glass-card flex items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Loading…
              </div>
            ) : privacy ? (
              <div className="glass-card divide-y divide-border/50">
                <PrivacyRow
                  label="Show me on leaderboards"
                  desc="Display name only — never your email."
                  checked={privacy.leaderboard_visibility === "public"}
                  onChange={(v) =>
                    updatePrivacy({ leaderboard_visibility: v ? "public" : "private" })
                  }
                />
                <PrivacyRow
                  label="Analytics"
                  desc="Help partners measure aggregate, privacy-safe traffic."
                  checked={privacy.analytics_consent}
                  onChange={(v) => updatePrivacy({ analytics_consent: v })}
                />
                <PrivacyRow
                  label="Location for verification"
                  desc="Used only to verify GPS check-ins. Coordinates are never stored."
                  checked={privacy.location_consent}
                  onChange={(v) => updatePrivacy({ location_consent: v })}
                />
                <PrivacyRow
                  label="Marketing emails"
                  desc="Occasional updates about new quests & rewards."
                  checked={privacy.marketing_consent}
                  onChange={(v) => updatePrivacy({ marketing_consent: v })}
                />
              </div>
            ) : null}
          </section>
        )}

        <p className="text-center text-xs text-muted-foreground">
          You control your data.{" "}
          <Link to="/privacy" className="underline underline-offset-2">
            Privacy policy
          </Link>{" "}
          · Request export or deletion anytime.
        </p>
      </div>
    </AppLayout>
  );
}

function FieldRow({
  label,
  value,
  onChange,
  disabled,
  hint,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  hint?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="h-11"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PrivacyRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}
