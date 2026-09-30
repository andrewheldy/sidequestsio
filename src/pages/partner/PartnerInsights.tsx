import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout, { type DashNavItem } from "@/components/dashboard/DashboardLayout";
import PartnerInsightsView from "@/components/dashboard/PartnerInsightsView";
import { EmptyState, Loading } from "@/components/app/ui";
import { usePartnerAccess } from "@/lib/partner/usePartner";
import { getRepository } from "@/lib/db";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;

/**
 * /partner                  — a partner's insights across all its venues
 * /partner/venues/:venueId  — the same dashboard for one venue
 *
 * Admins pick any partner (?partner=<id>); a partner login sees only its own.
 * The data call (partner_insights, 0021) re-checks access in the database.
 */
export default function PartnerInsights() {
  const { venueId } = useParams<{ venueId?: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const days = RANGES.find((d) => String(d) === params.get("days")) ?? 30;

  const { data: access, isLoading: accessLoading, isError: accessError } = usePartnerAccess();
  const partners = access?.partners ?? [];
  const partner = partners.find((p) => p.id === params.get("partner")) ?? partners[0] ?? null;

  const { data: venues = [] } = useQuery({
    queryKey: ["partner-venues", partner?.id],
    queryFn: async () => (await getRepository()).listVenues(partner!.id),
    enabled: !!partner,
  });
  const venueKnown = !venueId || venues.some((v) => v.id === venueId);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["partner-insights", partner?.id, venueId ?? null, days],
    queryFn: async () =>
      (await getRepository()).getPartnerInsights({ partnerId: partner!.id, venueId: venueId ?? null, days }),
    enabled: !!partner,
    staleTime: 60_000,
  });

  const query = (next: Record<string, string>) => {
    const q = new URLSearchParams({ ...(access?.isAdmin && partner ? { partner: partner.id } : {}), days: String(days), ...next });
    return `?${q.toString()}`;
  };
  const venueHref = (id: string) => `/partner/venues/${id}${query({})}`;
  const nav: DashNavItem[] = [
    { to: `/partner${query({})}`, label: "All venues", end: true },
    ...venues.map((v) => ({ to: venueHref(v.id), label: v.name })),
  ];

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  if (accessLoading) {
    return (
      <DashboardLayout title="Partner Insights" nav={[]}>
        <Loading />
      </DashboardLayout>
    );
  }

  if (accessError || !partner) {
    return (
      <DashboardLayout title="Partner Insights" nav={[]}>
        <EmptyState
          title={accessError ? "Couldn't check your access" : "No partner account linked"}
          description={
            accessError
              ? "Check your connection and try again."
              : "Partner Insights is for SideQuests partners. Ask the SideQuests team to link your login to your business."
          }
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Partner Insights" nav={nav}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {venueId ? (
            <p className="text-sm text-muted-foreground">
              <Link to={`/partner${query({})}`} className="hover:text-foreground hover:underline">
                {partner.name}
              </Link>{" "}
              / venue
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Partner overview · all venues</p>
          )}
          <h1 className="font-poppins text-2xl font-bold text-foreground">
            {venueId ? data?.venue?.name ?? venues.find((v) => v.id === venueId)?.name ?? "Venue" : partner.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {access?.isAdmin && partners.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="sr-only md:not-sr-only">Partner</span>
              <select
                value={partner.id}
                onChange={(e) => {
                  // Switching partner leaves any venue page (it belongs to the old partner).
                  const q = new URLSearchParams({ partner: e.target.value, days: String(days) });
                  navigate(`/partner?${q.toString()}`);
                }}
                className="h-9 max-w-[16rem] rounded-lg border border-border bg-card px-2 text-sm text-foreground"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div role="radiogroup" aria-label="Date range" className="inline-flex rounded-lg bg-muted p-0.5">
            {RANGES.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={days === d}
                onClick={() => setParam("days", String(d))}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  days === d ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
      </div>

      {!venueKnown ? (
        <EmptyState title="Venue not found" description="This venue isn't part of this partner." />
      ) : isLoading ? (
        <Loading />
      ) : isError || !data ? (
        <EmptyState
          title="Couldn't load insights"
          description="Check your connection and try again."
          action={
            <button type="button" onClick={() => void refetch()} className="text-sm font-semibold underline">
              Retry
            </button>
          }
        />
      ) : (
        <PartnerInsightsView data={data} venueHref={venueHref} />
      )}
    </DashboardLayout>
  );
}
