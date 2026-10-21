import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../../theme/tokens';
import type { QuestWithContext } from '../../lib/types';
import { questCoords, type Coords } from './geo';

const MIAMI: Coords = { latitude: 25.7617, longitude: -80.1918 };

function regionFor(points: Coords[]) {
  if (points.length === 0) return { ...MIAMI, latitudeDelta: 0.25, longitudeDelta: 0.25 };
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.02),
    longitudeDelta: Math.max((maxLon - minLon) * 1.5, 0.02),
  };
}

/** Native map with one marker per quest that has venue coordinates. */
export function QuestMap({
  quests,
  selectedId,
  userCoords,
  onSelect,
  onOpen,
}: {
  quests: QuestWithContext[];
  selectedId: string | null;
  userCoords: Coords | null;
  onSelect: (questId: string) => void;
  onOpen: (questId: string) => void;
}) {
  const mappable = quests.flatMap((quest) => {
    const coords = questCoords(quest);
    return coords ? [{ quest, coords }] : [];
  });
  return (
    <MapView
      style={styles.map}
      initialRegion={regionFor(mappable.map((m) => m.coords))}
      showsUserLocation={!!userCoords}
      userInterfaceStyle="dark"
      accessibilityLabel="Map of quests"
    >
      {mappable.map(({ quest, coords }) => (
        <Marker
          key={quest.id}
          identifier={quest.id}
          coordinate={coords}
          title={quest.title}
          pinColor={quest.id === selectedId ? colors.accent : colors.secondary}
          onPress={() => onSelect(quest.id)}
          onCalloutPress={() => onOpen(quest.id)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, minHeight: 200 },
});
