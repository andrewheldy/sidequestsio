import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { MIAMI_REGION } from '../../lib/discovery/areas';
import type { QuestCard } from '../../lib/discovery/types';
import { getConfig } from '../../lib/config';
import { colors } from '../theme';

type Props = {
  quests: QuestCard[];
  showsUserLocation: boolean;
  onSearchArea: (center: { latitude: number; longitude: number }) => void;
  onRecenter: (() => void) | null;
};

function frame(quests: QuestCard[]): Region {
  if (!quests.length) return MIAMI_REGION;
  const lats = quests.map((q) => q.latitude);
  const lngs = quests.map((q) => q.longitude);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.4),
    longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.4),
  };
}

/**
 * Quest pins. The camera is framed once; panning never snaps back, and only
 * the explicit recenter control returns to the device. Panning offers
 * "Search this area" — it never pretends the person is there.
 */
export function QuestMap({ quests, showsUserLocation, onSearchArea, onRecenter }: Props) {
  const initial = useRef<Region>(frame(quests));
  const map = useRef<MapView>(null);
  const [pendingCenter, setPendingCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  if (Platform.OS === 'android' && !getConfig().androidMap) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeText}>The map isn’t set up in this Android build yet. The list below shows the same quests.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={map}
        style={styles.map}
        initialRegion={initial.current}
        showsUserLocation={showsUserLocation}
        accessibilityLabel="Map of quests. The list below has the same quests."
        onRegionChangeComplete={(region, details) => {
          if (details?.isGesture) setPendingCenter({ latitude: region.latitude, longitude: region.longitude });
        }}
      >
        {quests.map((quest) => (
          <Marker key={quest.id} coordinate={{ latitude: quest.latitude, longitude: quest.longitude }} title={quest.title} description={quest.locationLabel ?? undefined} />
        ))}
      </MapView>
      <View style={styles.overlay}>
        {pendingCenter && (
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => {
              onSearchArea(pendingCenter);
              setPendingCenter(null);
            }}
          >
            <Text style={styles.buttonLabel}>Search this area</Text>
          </Pressable>
        )}
        {onRecenter && (
          <Pressable accessibilityRole="button" accessibilityLabel="Recenter on my location" style={styles.button} onPress={onRecenter}>
            <Text style={styles.buttonLabel}>Recenter</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 280, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
  overlay: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' },
  button: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonLabel: { color: colors.ink, fontWeight: '600' },
  notice: { padding: 16, borderRadius: 12, backgroundColor: colors.subtle },
  noticeText: { color: colors.text, fontSize: 14 },
});
