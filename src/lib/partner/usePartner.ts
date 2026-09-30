import { useQuery } from "@tanstack/react-query";
import { getRepository } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { isDemoMode } from "@/lib/demo";
import type { Partner } from "@/types/db";

/**
 * Resolves the partner the current user manages. Partner accounts map to a
 * single partner (owner_user_id); admins fall back to the first partner so they
 * can inspect the portal.
 */
export function usePartner() {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ["partner-context", user?.id, role],
    queryFn: async () => {
      const repo = await getRepository();
      const owned = user ? await repo.getPartnerByOwner(user.id) : null;
      if (owned) return owned;
      if (role === "admin") {
        const all = await repo.listPartners();
        return all[0] ?? null;
      }
      return null;
    },
    enabled: !!user,
  });
}

export interface PartnerAccess {
  isAdmin: boolean;
  /** Partners this user may open in Partner Insights (all of them for admins). */
  partners: Partner[];
}

/**
 * Which partners the signed-in user can see in Partner Insights. Admin status
 * comes from users.role — what is_admin() checks server-side — never from
 * editable auth metadata. This only shapes the UI: partner_insights() enforces
 * owns_partner() in the database. Dev builds (mock data) act as admin.
 */
export function usePartnerAccess() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["partner-access", user?.id ?? "demo"],
    enabled: !!user || isDemoMode,
    queryFn: async (): Promise<PartnerAccess> => {
      const repo = await getRepository();
      const isAdmin =
        isDemoMode || (user ? (await repo.getUserById(user.id))?.role === "admin" : false);
      if (isAdmin) {
        const partners = await repo.listPartners();
        return { isAdmin, partners: [...partners].sort((a, b) => a.name.localeCompare(b.name)) };
      }
      const owned = user ? await repo.getPartnerByOwner(user.id) : null;
      return { isAdmin: false, partners: owned ? [owned] : [] };
    },
  });
}
