import { Tabs } from 'expo-router';

export const unstable_settings = { anchor: 'index' };

export default function TabLayout() {
  return (
    <Tabs backBehavior="initialRoute" screenOptions={{ tabBarIcon: () => null }}>
      <Tabs.Screen name="rewards" options={{ title: 'Rewards' }} />
      <Tabs.Screen name="index" options={{ title: 'Explore' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
