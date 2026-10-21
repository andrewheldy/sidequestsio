import { useLocalSearchParams } from 'expo-router';
import { CompleteQuestScreen } from '../../../features/quest-loop/CompleteQuestScreen';

export default function CompleteQuestRoute() {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  return <CompleteQuestScreen questId={Array.isArray(questId) ? questId[0] : questId} />;
}
