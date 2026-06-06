import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PARTNER_NAV } from "@/components/dashboard/navs";
import { Loading, EmptyState } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePartner } from "@/lib/partner/usePartner";
import { getRepository } from "@/lib/db";
import type { Difficulty, QuestCategory, VerificationType } from "@/types/db";
import { toast } from "sonner";

const CATEGORIES: QuestCategory[] = ["art", "food", "outdoors", "culture", "nightlife", "shopping", "fitness", "hidden_gem"];
const VERIFICATIONS: VerificationType[] = ["qr", "nfc", "gps", "venue_code", "staff_approval"];

export default function PartnerQuests() {
  const { data: partner } = usePartner();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ["partner-quests", partner?.id],
    queryFn: async () => (await getRepository()).listQuests({ partnerId: partner!.id }),
    enabled: !!partner,
  });

  return (
    <DashboardLayout title="Partner Portal" nav={PARTNER_NAV}>
      <div className="flex items-center justify-between">
        <h1 className="font-poppins text-2xl font-bold text-foreground">Quests</h1>
        {partner && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <Plus className="h-4 w-4" /> New quest
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create quest</DialogTitle>
              </DialogHeader>
              <CreateQuestForm
                partnerId={partner.id}
                onCreated={() => {
                  setOpen(false);
                  qc.invalidateQueries({ queryKey: ["partner-quests", partner.id] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Loading />
        ) : quests.length === 0 ? (
          <EmptyState title="No quests yet" description="Create your first quest to start attracting questers." />
        ) : (
          <div className="space-y-2">
            {quests.map((q) => (
              <div key={q.id} className="glass-card flex items-center justify-between p-4">
                <div>
                  <p className="font-poppins font-semibold text-foreground">{q.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {q.category.replace("_", " ")} · {q.verification_type.replace("_", " ")} · +{q.xp_reward} XP / +{q.points_reward} pts
                  </p>
                </div>
                <Badge className="capitalize">{q.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function CreateQuestForm({
  partnerId,
  onCreated,
}: {
  partnerId: string;
  onCreated: () => void;
}) {
  const { data: venues = [] } = useQuery({
    queryKey: ["partner-venues", partnerId],
    queryFn: async () => (await getRepository()).listVenues(partnerId),
  });
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "art" as QuestCategory,
    difficulty: "easy" as Difficulty,
    xp_reward: 50,
    points_reward: 100,
    verification_type: "qr" as VerificationType,
    verification_secret: "",
    venue_id: "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    const repo = await getRepository();
    await repo.upsertQuest({
      partner_id: partnerId,
      title: form.title,
      description: form.description,
      category: form.category,
      difficulty: form.difficulty,
      xp_reward: Number(form.xp_reward),
      points_reward: Number(form.points_reward),
      verification_type: form.verification_type,
      verification_secret: form.verification_type === "venue_code" ? form.verification_secret : null,
      venue_id: form.venue_id || null,
      status: "active",
    });
    setBusy(false);
    toast.success("Quest created");
    onCreated();
  };

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input placeholder="Title" value={form.title} onChange={(e) => set("title", e.target.value)} required />
      <Textarea placeholder="Description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
      <div className="grid grid-cols-2 gap-2">
        <Select label="Category" value={form.category} options={CATEGORIES} onChange={(v) => set("category", v)} />
        <Select label="Difficulty" value={form.difficulty} options={["easy", "medium", "hard"]} onChange={(v) => set("difficulty", v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="XP reward" value={form.xp_reward} onChange={(v) => set("xp_reward", v)} />
        <NumberField label="Points reward" value={form.points_reward} onChange={(v) => set("points_reward", v)} />
      </div>
      <Select label="Verification" value={form.verification_type} options={VERIFICATIONS} onChange={(v) => set("verification_type", v)} />
      {form.verification_type === "venue_code" && (
        <Input placeholder="Venue code (e.g. SUNRISE)" value={form.verification_secret} onChange={(e) => set("verification_secret", e.target.value)} />
      )}
      {venues.length > 0 && (
        <Select
          label="Venue"
          value={form.venue_id}
          options={["", ...venues.map((v) => v.id)]}
          labels={{ "": "— none —", ...Object.fromEntries(venues.map((v) => [v.id, v.name])) }}
          onChange={(v) => set("venue_id", v)}
        />
      )}
      <Button type="submit" disabled={busy} className="w-full">
        Create quest
      </Button>
    </form>
  );
}

function Select({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm capitalize text-foreground"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Input type="number" value={value} min={0} onChange={(e) => onChange(Number(e.target.value))} className="mt-1" />
    </label>
  );
}
