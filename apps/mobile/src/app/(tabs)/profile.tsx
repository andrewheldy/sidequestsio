import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';
import { colors } from '../../components/theme';

export default function ProfileScreen() {
  return (
    <PlaceholderScreen title="Profile" description="Your explorer profile will appear here.">
      <Link href="/settings/location" asChild>
        <Pressable accessibilityRole="link" style={styles.item}>
          <Text style={styles.label}>Location & nearby alerts</Text>
        </Pressable>
      </Link>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  item: { minHeight: 48, justifyContent: 'center', padding: 16, borderWidth: 1, borderColor: colors.ink, borderRadius: 8 },
  label: { color: colors.ink, fontSize: 16, fontWeight: '600' },
});
