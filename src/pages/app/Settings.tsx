import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { SectionHeader } from "@/components/app/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isDemoMode } from "@/lib/demo";

export default function Settings() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    display_name: profile?.display_name ?? "",
    username: profile?.username ?? "",
    phone_number: profile?.phone_number ?? "",
    instagram_url: profile?.instagram_url ?? "",
    tiktok_url: profile?.tiktok_url ?? "",
    x_url: profile?.x_url ?? "",
  });

  const [saving, setSaving] = useState(false);

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const save = async () => {
    if (isDemoMode) {
      toast.info("Demo mode — saving disabled for now.");
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({
      display_name: form.display_name || null,
      username: form.username || null,
      phone_number: form.phone_number || null,
      instagram_url: form.instagram_url || null,
      tiktok_url: form.tiktok_url || null,
      x_url: form.x_url || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Settings saved");
    }
  };

  const cancel = () => navigate("/app/profile");

  return (
    <AppLayout title="Settings">
      <div className="space-y-6 pb-4">
        <Button variant="ghost" onClick={cancel} className="-ml-1 gap-2 pl-0">
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

        {/* Social links */}
        <section>
          <SectionHeader title="Social Links" />
          <div className="glass-card space-y-4 p-4">
            <FieldRow
              label="Instagram"
              value={form.instagram_url}
              onChange={set("instagram_url")}
              placeholder="https://instagram.com/you"
              type="url"
            />
            <FieldRow
              label="TikTok"
              value={form.tiktok_url}
              onChange={set("tiktok_url")}
              placeholder="https://tiktok.com/@you"
              type="url"
            />
            <FieldRow
              label="X / Twitter"
              value={form.x_url}
              onChange={set("x_url")}
              placeholder="https://x.com/you"
              type="url"
            />
          </div>
        </section>

        {/* Save / Cancel */}
        {isDemoMode && (
          <p className="rounded-lg bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-400">
            Demo mode — saving disabled for now.
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={cancel} className="h-11 flex-1">
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="h-11 flex-1 gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

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
