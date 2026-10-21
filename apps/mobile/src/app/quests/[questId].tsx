import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';

export default function QuestDetailScreen() {
  const { questId } = useLocalSearchParams<{ questId: string }>();

  return (
    <PlaceholderScreen title="Quest detail" description="Quest details will appear here." bottomInset>
      <Text>Quest ID: {questId}</Text>
    </PlaceholderScreen>
  );
}
