import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '../components/discovery/Chip';
import { QuestCardView } from '../components/discovery/QuestCardView';
import { QuestMap } from '../components/discovery/QuestMap';
import { colors } from '../components/theme';
import { useCapability } from '../hooks/useCapability';
import { useDeviceSettings } from '../hooks/useDeviceSettings';
import { useDiscovery } from '../hooks/useDiscovery';
import { useForegroundLocation } from '../hooks/useForegroundLocation';
import { onSuggestion, setDiscoveryVisible } from '../lib/adventure/foreground';
import { getConfig } from '../lib/config';
import { DEFAULT_AREA_ID, DISCOVERY_AREAS, areaLabel } from '../lib/discovery/areas';
import { CATEGORY_LABELS, deviceUnits, formatRadius } from '../lib/discovery/format';
import type { DiscoveryOrigin, QuestCategory } from '../lib/discovery/types';
import { requestForeground } from '../lib/location/adapter';
import type { NudgeCandidate } from '../lib/storage/deviceStore';

const RADII = [1, 3, 5, 10];
const DURATIONS: { label: string; value: number | null }[] = [
  { label: 'Any length', value: null },
  { label: '≤ 15 min', value: 15 },
  { label: '≤ 30 min', value: 30 },
  { label: '≤ 60 min', value: 60 },
];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as QuestCategory[];

type Source = 'area' | 'device' | 'map';
type Prompt = null | 'explain' | 'denied' | 'unavailable';

export default function NearbyExploreScreen() {
  const { settings, update } = useDeviceSettings();
  const { capability, permissions, refresh: refreshCapability } = useCapability(settings);
  const [focused, setFocused] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [categories, setCategories] = useState<QuestCategory[]>([]);
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [suggestion, setSuggestion] = useState<NudgeCandidate | null>(null);
  const units = useMemo(deviceUnits, []);
  const nearbyEnabled = getConfig().nearbyEnabled;

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setDiscoveryVisible(true);
      return () => {
        setFocused(false);
        setDiscoveryVisible(false);
      };
    }, []),
  );
  useEffect(() => onSuggestion(setSuggestion), []);

  // Start in the chosen area; use the device only once the person chose Explore/Adventure.
  useEffect(() => {
    if (source || !settings || !capability) return;
    setSource(capability.canUseDeviceLocation ? 'device' : 'area');
  }, [source, settings, capability]);

  const deviceActive = focused && source === 'device' && !!capability?.canUseDeviceLocation;
  const { location, refresh: relocate } = useForegroundLocation(deviceActive);
  useEffect(() => {
    if (source === 'device' && location.status === 'unavailable') setPrompt('unavailable');
  }, [source, location.status]);

  const areaId = settings?.selectedAreaId ?? DEFAULT_AREA_ID;
  const origin: DiscoveryOrigin | null = useMemo(() => {
    if (!settings || !source) return null;
    if (source === 'map' && mapCenter) return { source: 'map', ...mapCenter };
    if (source === 'device') {
      if (!capability?.canUseDeviceLocation) return { source: 'area', areaId };
      if (location.status === 'ready' && location.quality !== 'unusable') {
        return { source: 'device', latitude: location.sample.latitude, longitude: location.sample.longitude };
      }
      if (location.status === 'unavailable') return { source: 'area', areaId };
      return null;
    }
    return { source: 'area', areaId };
  }, [settings, source, mapCenter, capability?.canUseDeviceLocation, location, areaId]);

  const radiusKm = settings?.radiusKm ?? 3;
  const filters = useMemo(() => ({ radiusKm, categories, maxMinutes }), [radiusKm, categories, maxMinutes]);
  const discovery = useDiscovery(nearbyEnabled ? origin : null, filters);

  const distanceContext =
    origin?.source !== 'device' ? 'area' : location.status === 'ready' && location.quality !== 'precise' ? 'approximate' : 'device';
  const originHeading =
    origin?.source === 'device'
      ? 'Near you'
      : origin?.source === 'map'
        ? 'Search this map area'
        : `Around ${discovery.originLabel ?? areaLabel(areaId)}`;

  const onNearMe = async () => {
    if (!permissions) return;
    if (permissions.foreground === 'granted' && permissions.servicesEnabled) {
      if (settings?.desiredMode === 'manual') await update({ desiredMode: 'explore' });
      await refreshCapability();
      setPrompt(null);
      setSource('device');
      return;
    }
    if (!permissions.servicesEnabled) return setPrompt('unavailable');
    setPrompt(permissions.canAskForeground ? 'explain' : 'denied');
  };

  const onAllowLocation = async () => {
    const next = await requestForeground().catch(() => null);
    if (next?.foreground === 'granted') {
      await update({ desiredMode: settings?.desiredMode === 'adventure' ? 'adventure' : 'explore' });
      await refreshCapability();
      setPrompt(null);
      setSource('device');
    } else {
      setPrompt('denied');
    }
  };

  const chooseArea = (id: string) => {
    update({ selectedAreaId: id });
    setPrompt(null);
    setSource('area');
  };

  const toggleCategory = (category: QuestCategory) =>
    setCategories((current) => (current.includes(category) ? current.filter((c) => c !== category) : [...current, category]));

  const nextRadius = RADII.find((r) => r > radiusKm);

  const header = (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>Explore</Text>
      <Text style={styles.subtitle}>Your next side quest starts here.</Text>

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Near me: show quests near my location"
          accessibilityState={{ selected: source === 'device' }}
          onPress={onNearMe}
          style={[styles.nearMe, source === 'device' && styles.nearMeActive]}
        >
          <Text style={[styles.nearMeLabel, source === 'device' && styles.nearMeLabelActive]}>
            {source === 'device' ? '✓ Near me' : 'Near me'}
          </Text>
        </Pressable>
        <Link href="/settings/location" asChild>
          <Pressable accessibilityRole="link" style={styles.settingsLink}>
            <Text style={styles.link}>Location settings</Text>
          </Pressable>
        </Link>
      </View>

      {prompt === 'explain' && (
        <View style={styles.panel}>
          <Text style={styles.panelText}>
            Show quests near you? SideQuests uses your location while you’re using the app to sort quests by distance.
            Your location isn’t saved.
          </Text>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" style={styles.primary} onPress={onAllowLocation}>
              <Text style={styles.primaryLabel}>Use my location</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => setPrompt(null)}>
              <Text style={styles.secondaryLabel}>Choose an area</Text>
            </Pressable>
          </View>
        </View>
      )}
      {prompt === 'denied' && (
        <View style={styles.panel}>
          <Text style={styles.panelText}>Location is off for SideQuests, so we’re showing quests around the area you choose.</Text>
          <Pressable accessibilityRole="link" onPress={() => Linking.openSettings().catch(() => undefined)}>
            <Text style={styles.link}>Open system settings</Text>
          </Pressable>
        </View>
      )}
      {prompt === 'unavailable' && (
        <View style={styles.panel}>
          <Text style={styles.panelText}>We couldn’t get your location right now. Showing quests around the area you choose.</Text>
          <Pressable accessibilityRole="button" onPress={() => { setPrompt(null); relocate(); }}>
            <Text style={styles.link}>Try again</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionLabel}>Area</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {DISCOVERY_AREAS.map((area) => (
          <Chip key={area.id} label={area.label} selected={source === 'area' && areaId === area.id} onPress={() => chooseArea(area.id)} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {RADII.map((km) => (
          <Chip
            key={km}
            label={formatRadius(km, units)}
            accessibilityLabel={`Within ${formatRadius(km, units)}`}
            selected={radiusKm === km}
            onPress={() => update({ radiusKm: km })}
          />
        ))}
        {DURATIONS.map((d) => (
          <Chip key={d.label} label={d.label} selected={maxMinutes === d.value} onPress={() => setMaxMinutes(d.value)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CATEGORIES.map((category) => (
          <Chip key={category} label={CATEGORY_LABELS[category]} selected={categories.includes(category)} onPress={() => toggleCategory(category)} />
        ))}
      </ScrollView>

      <View style={styles.row}>
        <Text accessibilityRole="header" style={styles.origin}>{originHeading}</Text>
        <View style={styles.toggle}>
          <Chip label="List" selected={view === 'list'} onPress={() => setView('list')} />
          <Chip label="Map" selected={view === 'map'} onPress={() => setView('map')} />
        </View>
      </View>
      {capability && <Text style={styles.status}>{capability.summary}</Text>}
      {distanceContext === 'approximate' && <Text style={styles.status}>Your location is approximate, so distances are rough.</Text>}

      {suggestion && (
        <View style={styles.panel} accessibilityLiveRegion="polite">
          <Text style={styles.panelText}>{`A quest is nearby: ${suggestion.title}`}</Text>
          <Link href={{ pathname: '/quests/[questId]', params: { questId: suggestion.questId } }} asChild>
            <Pressable accessibilityRole="link">
              <Text style={styles.link}>Take a look</Text>
            </Pressable>
          </Link>
        </View>
      )}

      {view === 'map' && (
        <QuestMap
          quests={discovery.items}
          showsUserLocation={permissions?.foreground === 'granted'}
          onSearchArea={(center) => {
            setMapCenter(center);
            setSource('map');
          }}
          onRecenter={capability?.canUseDeviceLocation ? () => { setSource('device'); relocate(); } : null}
        />
      )}
      {discovery.refreshing && <ActivityIndicator accessibilityLabel="Updating quests" />}
      {discovery.error && <ErrorPanel error={discovery.error} onRetry={discovery.retry} />}
      {__DEV__ && (
        <Link href={{ pathname: '/quests/[questId]', params: { questId: 'sample-quest' } }} asChild>
          <Pressable accessibilityRole="link" style={styles.secondary}>
            <Text style={styles.secondaryLabel}>Open sample quest</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );

  const showSkeleton = nearbyEnabled && (!origin || discovery.initialLoading) && !discovery.error;

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <FlatList
        data={showSkeleton ? [] : discovery.items}
        keyExtractor={(quest) => quest.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <QuestCardView quest={item} units={units} distanceContext={distanceContext} />}
        onEndReached={discovery.loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !nearbyEnabled ? (
            <Text style={styles.status}>Nearby discovery is turned off in this build.</Text>
          ) : showSkeleton ? (
            <Skeleton />
          ) : discovery.error ? undefined : (
            <View style={styles.panel}>
              <Text style={styles.panelText}>{`No quests within ${formatRadius(radiusKm, units)} here yet.`}</Text>
              {nextRadius ? (
                <Pressable accessibilityRole="button" onPress={() => update({ radiusKm: nextRadius })}>
                  <Text style={styles.link}>{`Search within ${formatRadius(nextRadius, units)}`}</Text>
                </Pressable>
              ) : (
                <Text style={styles.panelText}>Try another area.</Text>
              )}
            </View>
          )
        }
        ListFooterComponent={discovery.loadingMore ? <ActivityIndicator accessibilityLabel="Loading more quests" /> : undefined}
      />
    </SafeAreaView>
  );
}

function ErrorPanel({ error, onRetry }: { error: string; onRetry: () => void }) {
  const message =
    error === 'not_configured'
      ? 'Quest discovery isn’t connected in this build yet.'
      : error === 'unknown_area'
        ? 'That area isn’t available yet. Choose another.'
        : 'We couldn’t load quests. Check your connection and try again.';
  return (
    <View style={styles.panel} accessibilityLiveRegion="polite">
      <Text style={styles.panelText}>{message}</Text>
      {error !== 'not_configured' && (
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <Text style={styles.link}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

function Skeleton() {
  return (
    <View accessible accessibilityLabel="Loading quests" style={styles.skeletonList}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeleton} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 32 },
  header: { gap: 12, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '600', color: colors.ink },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  nearMe: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: colors.ink },
  nearMeActive: { backgroundColor: colors.ink },
  nearMeLabel: { color: colors.ink, fontWeight: '600', fontSize: 15 },
  nearMeLabelActive: { color: colors.surface },
  settingsLink: { minHeight: 44, justifyContent: 'center' },
  link: { color: colors.ocean, fontWeight: '600', fontSize: 15, paddingVertical: 6 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.muted },
  chips: { gap: 8, paddingRight: 16 },
  origin: { fontSize: 20, fontWeight: '600', color: colors.ink },
  toggle: { flexDirection: 'row', gap: 6 },
  status: { fontSize: 14, color: colors.text },
  panel: { gap: 8, padding: 14, borderRadius: 12, backgroundColor: colors.subtle },
  panelText: { fontSize: 15, lineHeight: 22, color: colors.text },
  primary: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.ink },
  primaryLabel: { color: colors.surface, fontWeight: '600' },
  secondary: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.ink },
  secondaryLabel: { color: colors.ink, fontWeight: '600' },
  separator: { height: 12 },
  skeletonList: { gap: 12 },
  skeleton: { height: 150, borderRadius: 12, backgroundColor: colors.subtle },
});
