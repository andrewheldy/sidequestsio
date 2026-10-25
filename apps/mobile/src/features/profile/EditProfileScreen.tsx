import { Stack } from 'expo-router';
import { Screen } from '../../components/ui';
import { useSession } from '../../session/SessionProvider';
import { updateOwnProfile } from './api';
import { EditProfileForm } from './EditProfileForm';
import { useAccount } from './useAccount';

export function EditProfileScreen() {
  const { account, gate } = useAccount();
  const { refreshProfile } = useSession();
  return (
    <Screen keyboard edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: 'Edit profile' }} />
      {account ? (
        <EditProfileForm
          profile={account.profile}
          onSubmit={async (patch) => {
            await updateOwnProfile(account.userId, patch);
            await refreshProfile();
          }}
        />
      ) : (
        gate
      )}
    </Screen>
  );
}
