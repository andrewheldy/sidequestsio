import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = PropsWithChildren<{ title: string; description: string; bottomInset?: boolean }>;

export function PlaceholderScreen({ title, description, bottomInset = false, children }: Props) {
  return (
    <SafeAreaView style={styles.screen} edges={bottomInset ? ['left', 'right', 'bottom'] : ['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '600', color: '#142638' },
  description: { fontSize: 16, lineHeight: 24, color: '#374151' },
});
