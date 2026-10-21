import { useLocalSearchParams } from 'expo-router';
import { QuestDetailScreen } from '../../../features/discovery/QuestDetailScreen';

export default function QuestDetailRoute() {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  return <QuestDetailScreen questId={Array.isArray(questId) ? questId[0] : questId} />;
}
