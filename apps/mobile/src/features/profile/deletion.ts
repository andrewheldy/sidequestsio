import { supportEmail } from '../../lib/config';

export const DELETION_SUBJECT = 'Account Deletion Request';

/**
 * Deletion is an emailed request (docs/legal/Delete-Account.md): there is no
 * server endpoint yet. The prefilled message identifies the account; nothing is
 * deleted until support processes it.
 */
export function deletionMailto(email: string | null | undefined, userId: string): string {
  const body = [
    'Please delete my SideQuests account and associated personal data.',
    '',
    `Account email: ${email ?? '(unknown)'}`,
    `User ID: ${userId}`,
  ].join('\n');
  return `mailto:${supportEmail}?subject=${encodeURIComponent(DELETION_SUBJECT)}&body=${encodeURIComponent(body)}`;
}

export function supportMailto(): string {
  return `mailto:${supportEmail}?subject=${encodeURIComponent('SideQuests support')}`;
}
