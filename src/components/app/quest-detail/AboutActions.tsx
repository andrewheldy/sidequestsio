import { Globe, Link2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "About" — exactly three actions: Website, Reviews, Socials. No more, no less.
 *
 * Socials intentionally points at a SINGLE external landing page (Linktree /
 * Linkme style), never individual Instagram / TikTok / X buttons. There is no
 * dedicated `socials_url` column yet, so the page resolves the best-available
 * social link and passes it here; the second (DB) pass can introduce a proper
 * single field with zero UI changes.
 */
export function AboutActions({
  businessName,
  websiteUrl,
  reviewsUrl,
  socialsUrl,
  onAction,
}: {
  businessName: string | null;
  websiteUrl?: string | null;
  reviewsUrl?: string | null;
  socialsUrl?: string | null;
  onAction: (type: "website" | "google_reviews" | "socials") => void;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <header className="mb-3 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          About {businessName ?? "this spot"}
        </h2>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <ActionCard
          icon={<Globe className="h-5 w-5 text-[hsl(215_90%_62%)]" />}
          label="Website"
          href={websiteUrl}
          onClick={() => onAction("website")}
        />
        <ActionCard
          icon={<Star className="h-5 w-5 text-primary" />}
          label="Reviews"
          href={reviewsUrl}
          onClick={() => onAction("google_reviews")}
        />
        <ActionCard
          icon={<Link2 className="h-5 w-5 text-secondary" />}
          label="Socials"
          sublabel="All our links"
          href={socialsUrl}
          onClick={() => onAction("socials")}
        />
      </div>
    </section>
  );
}

function ActionCard({
  icon,
  label,
  sublabel,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  href?: string | null;
  onClick: () => void;
}) {
  const inner = (
    <>
      {icon}
      <span className="mt-2 text-sm font-semibold text-foreground">{label}</span>
      {sublabel && <span className="text-[11px] text-muted-foreground">{sublabel}</span>}
    </>
  );

  const base =
    "flex min-h-[84px] flex-col items-center justify-center rounded-xl border border-border/50 bg-background/40 px-2 py-3 text-center transition-colors";

  if (!href) {
    return (
      <div className={cn(base, "opacity-40")} aria-disabled>
        {inner}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(base, "hover:border-primary/40 hover:bg-background/70 active:scale-[0.97]")}
    >
      {inner}
    </a>
  );
}

export default AboutActions;
