import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '../../theme/tokens';

export const unstable_settings = { anchor: 'index' };

export default function TabLayout() {
  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.backgroundSubtle, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="rewards"
        options={{ title: 'Rewards', tabBarIcon: ({ color, size }) => <Ionicons name="gift-outline" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: 'Explore', tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
