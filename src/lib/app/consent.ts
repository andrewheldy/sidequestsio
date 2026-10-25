import type { Repository } from "@/lib/db/repository";
import type { ConsentType, PrivacyPreferences } from "@/types/db";

/**
 * Saves privacy preferences and appends one consent_events row for every
 * `*_consent` field in the patch, so the ledger records each grant and
 * withdrawal (docs/legal/Privacy-Policy.md § Your Rights and Choices).
 */
export async function savePrivacyChoices(
  repo: Repository,
  userId: string,
  patch: Partial<PrivacyPreferences>,
  source: string,
): Promise<void> {
  await repo.updatePrivacy(userId, patch);
  for (const [key, value] of Object.entries(patch)) {
    if (key.endsWith("_consent") && typeof value === "boolean") {
      await repo.recordConsent({
        userId,
        consentType: key.replace("_consent", "") as ConsentType,
        granted: value,
        source,
      });
    }
  }
}
