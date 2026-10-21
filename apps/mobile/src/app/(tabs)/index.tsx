import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';

export default function ExploreScreen() {
  return (
    <PlaceholderScreen title="Explore" description="Your next side quest starts here.">
      {__DEV__ && (
        <Link href={{ pathname: '/quests/[questId]', params: { questId: 'sample-quest' } }} asChild>
          <Pressable accessibilityRole="link" style={styles.sample}>
            <Text style={styles.label}>Open sample quest</Text>
          </Pressable>
        </Link>
      )}
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  sample: { minHeight: 48, justifyContent: 'center', padding: 16, borderWidth: 1, borderColor: '#142638', borderRadius: 8 },
  label: { color: '#142638', fontSize: 16, fontWeight: '600' },
});
