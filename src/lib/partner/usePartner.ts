import { useQuery } from "@tanstack/react-query";
import { getRepository } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";

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
