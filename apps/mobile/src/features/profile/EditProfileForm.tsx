import { useState } from 'react';
import { View } from 'react-native';
import { Button, TextField } from '../../components/ui';
import type { AccountProfile } from '../../lib/types';
import { spacing } from '../../theme/tokens';
import { FormMessage } from '../account/components';
import type { ProfilePatch } from './api';
import { bioError, displayNameError, homeCityError, normalize, profileLimits, usernameError } from './validation';

type Field = 'display_name' | 'username' | 'bio' | 'home_city';
const FIELDS: Field[] = ['display_name', 'username', 'bio', 'home_city'];

const validators: Record<Field, (value: string) => string | null> = {
  display_name: displayNameError,
  username: usernameError,
  bio: bioError,
  home_city: homeCityError,
};

/**
 * Edits are kept separately from the loaded profile, so a refetch updates the
 * untouched fields without ever overwriting what the user has typed. A field is
 * dirty only if its edited value differs from the loaded one.
 */
export function EditProfileForm({
  profile,
  onSubmit,
}: {
  profile: AccountProfile;
  /** Rejects with a user-facing message if the write fails. */
  onSubmit: (patch: ProfilePatch) => Promise<void>;
}) {
  const [edits, setEdits] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const valueOf = (field: Field) => edits[field] ?? profile[field] ?? '';
  const changed = FIELDS.filter((f) => f in edits && normalize(edits[f]) !== normalize(profile[f]));
  const errors = Object.fromEntries(FIELDS.map((f) => [f, f in edits ? validators[f](valueOf(f)) : null])) as Record<Field, string | null>;
  const invalid = FIELDS.some((f) => errors[f]);
  const canSave = changed.length > 0 && !invalid && !saving;

  const set = (field: Field) => (text: string) => {
    setSaved(false);
    setEdits((prev) => ({ ...prev, [field]: text }));
  };

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const patch: ProfilePatch = {};
      for (const f of changed) patch[f] = normalize(edits[f]);
      await onSubmit(patch);
      setEdits({});
      setSaved(true);
    } catch (e) {
      // Keep every edit; show why the write failed.
      setError(e instanceof Error && e.message ? e.message : 'Your changes could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <TextField
        label="Display name"
        value={valueOf('display_name')}
        onChangeText={set('display_name')}
        error={errors.display_name}
        maxLength={profileLimits.displayName + 20}
        autoCapitalize="words"
        textContentType="name"
      />
      <TextField
        label="Username"
        value={valueOf('username')}
        onChangeText={set('username')}
        error={errors.username}
        hint="Optional. Letters, numbers, underscores and periods."
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
      />
      <TextField
        label="Bio"
        value={valueOf('bio')}
        onChangeText={set('bio')}
        error={errors.bio}
        multiline
        numberOfLines={3}
        style={{ minHeight: 96, textAlignVertical: 'top', paddingVertical: spacing.sm }}
      />
      <TextField label="Home city" value={valueOf('home_city')} onChangeText={set('home_city')} error={errors.home_city} />
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {saved ? <FormMessage tone="success">Profile saved.</FormMessage> : null}
      <Button label="Save changes" onPress={() => void save()} disabled={!canSave} loading={saving} />
    </View>
  );
}
