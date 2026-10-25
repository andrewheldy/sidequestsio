import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, EmptyState, ErrorState, LoadingState, Screen, SetupRequired, Text, Wordmark } from '../../components/ui';
import { backend, getConfig, mapsAvailable } from '../../lib/config';
import type { QuestWithContext } from '../../lib/types';
import { colors, radii, spacing, touchTarget } from '../../theme/tokens';
import { QuestCard } from './QuestCard';
import { QuestMap } from './QuestMap';
import { applyFilters, categoriesIn, neighborhoodsIn, NO_FILTERS, sortByDistance, type Filters } from './filters';
import { distanceToQuest, questCoords } from './geo';
import { categoryLabel } from './questFormat';
import { useDeviceLocation } from './useDeviceLocation';
import { useQuestList } from './useQuests';

export function ExploreScreen() {
  if (backend.status !== 'ready') {
    return (
      <Screen>
        <SetupRequired />
      </Screen>
    );
  }
  return <ExploreContent />;
}

function ExploreContent() {
  const router = useRouter();
  const list = useQuestList();
  const location = useDeviceLocation();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [nearMe, setNearMe] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = useMemo(() => list.data?.quests ?? [], [list.data]);
  const categories = useMemo(() => categoriesIn(all), [all]);
  const neighborhoods = useMemo(() => neighborhoodsIn(all), [all]);
  const visible = useMemo(() => {
    const filtered = applyFilters(all, filters);
    return nearMe ? sortByDistance(filtered, location.coords) : filtered;
  }, [all, filters, nearMe, location.coords]);

  const open = (questId: string) => router.push({ pathname: '/quests/[questId]', params: { questId } });
  const milesFor = (quest: QuestWithContext) => distanceToQuest(location.coords, quest);

  const onNearMe = async () => {
    if (nearMe) {
      setNearMe(false);
      return;
    }
    if (location.coords || (await location.request())) setNearMe(true);
  };

  const header = (
    <View style={styles.header}>
      <Wordmark width={150} />
      <View style={styles.areaRow}>
        <View style={styles.area} accessible accessibilityLabel="Area: Miami">
          <Ionicons name="location" size={20} color={colors.accent} />
          <Text variant="title">Miami</Text>
        </View>
        <Pressable
          onPress={onNearMe}
          accessibilityRole="button"
          accessibilityLabel="Near me"
          accessibilityHint="Sorts quests by distance from you. Asks for location permission."
          accessibilityState={{ selected: nearMe, busy: location.status === 'locating' }}
          style={[styles.nearMe, nearMe && styles.nearMeOn]}
        >
          <Ionicons name="locate" size={18} color={colors.text} />
          <Text variant="bodyStrong">Near me</Text>
        </Pressable>
      </View>
      {getConfig().nearbyEnabled ? (
        <Button
          label="Search near you or an area"
          variant="secondary"
          icon="compass-outline"
          onPress={() => router.push('/nearby')}
          accessibilityHint="Opens location-ranked discovery with radius, time and area filters"
        />
      ) : null}
      {location.status === 'denied' ? (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Text variant="small" muted>
            Location is off, so we can&apos;t sort by distance. You can still browse every quest, or allow location in Settings.
          </Text>
          <Button label="Open settings" variant="secondary" onPress={() => void Linking.openSettings()} />
        </View>
      ) : null}
      {location.status === 'unavailable' ? (
        <Text variant="small" muted accessibilityLiveRegion="polite">
          We couldn&apos;t get your location right now. Browsing still works.
        </Text>
      ) : null}
      {categories.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityLabel="Category filter">
          <Chip label="All" selected={!filters.category} onPress={() => setFilters({ ...filters, category: null })} />
          {categories.map((c) => (
            <Chip
              key={c}
              label={categoryLabel(c)}
              selected={filters.category === c}
              onPress={() => setFilters({ ...filters, category: filters.category === c ? null : c })}
            />
          ))}
        </ScrollView>
      ) : null}
      {neighborhoods.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityLabel="Neighborhood filter">
          {neighborhoods.map((n) => (
            <Chip
              key={n}
              icon="map-outline"
              label={n}
              selected={filters.neighborhood === n}
              onPress={() => setFilters({ ...filters, neighborhood: filters.neighborhood === n ? null : n })}
            />
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.modeRow}>
        {mapsAvailable ? (
          <View style={styles.segmented} accessibilityRole="tablist">
            {(['list', 'map'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                accessibilityRole="tab"
                accessibilityLabel={m === 'list' ? 'List view' : 'Map view'}
                accessibilityState={{ selected: mode === m }}
                style={[styles.segment, mode === m && styles.segmentOn]}
              >
                <Ionicons name={m === 'list' ? 'list' : 'map'} size={16} color={colors.text} />
                <Text variant="bodyStrong">{m === 'list' ? 'List' : 'Map'}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text variant="caption" muted>
            Map view isn&apos;t available in this build. The list shows every quest.
          </Text>
        )}
        {list.data && !list.data.complete ? (
          <Text variant="caption" muted>
            Not all quests are shown.
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (list.isPending) {
    return (
      <Screen scroll={false} padded={false}>
        {header}
        <LoadingState label="Finding quests…" />
      </Screen>
    );
  }
  if (list.isError) {
    return (
      <Screen scroll={false} padded={false}>
        {header}
        <ErrorState title="Couldn't load quests" message="Check your connection and try again." onRetry={() => void list.refetch()} />
      </Screen>
    );
  }

  const empty =
    all.length === 0 ? (
      <EmptyState title="No quests yet" message="New quests are added regularly. Pull down to refresh." />
    ) : (
      <EmptyState
        title="No quests match"
        message="Try a different category or neighborhood."
        action={<Button label="Clear filters" variant="secondary" onPress={() => setFilters(NO_FILTERS)} />}
      />
    );

  if (mode === 'map' && mapsAvailable && visible.length > 0) {
    const mappable = visible.filter((q) => questCoords(q));
    const selected = visible.find((q) => q.id === selectedId && questCoords(q)) ?? mappable[0] ?? null;
    return (
      <Screen scroll={false} padded={false}>
        <ScrollView style={styles.mapHeader} bounces={false}>
          {header}
        </ScrollView>
        <View style={styles.mapBody}>
          <QuestMap quests={visible} selectedId={selected?.id ?? null} userCoords={location.coords} onSelect={setSelectedId} onOpen={open} />
          <View style={styles.mapCard}>
            {mappable.length < visible.length ? (
              <Text variant="caption" muted>
                {visible.length - mappable.length} quest(s) have no map location. Switch to List to see them.
              </Text>
            ) : null}
            {selected ? (
              <QuestCard quest={selected} miles={milesFor(selected)} selected onPress={() => open(selected.id)} />
            ) : (
              <Text muted>None of these quests have a map location. Switch to List to see them.</Text>
            )}
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={visible}
        keyExtractor={(q) => q.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={colors.accent} />}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <QuestCard quest={item} miles={milesFor(item)} selected={item.id === selectedId} onPress={() => open(item.id)} />
          </View>
        )}
      />
    </Screen>
  );
}

const Separator = () => <View style={{ height: spacing.md }} />;

const styles = StyleSheet.create({
  header: { padding: spacing.md, gap: spacing.sm },
  mapHeader: { maxHeight: '55%', flexGrow: 0 },
  areaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  area: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  nearMe: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  nearMeOn: { borderColor: colors.accent, borderWidth: 2 },
  notice: { gap: spacing.xs },
  chips: { gap: spacing.xs, paddingVertical: spacing.xxs },
  modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs },
  segmented: { flexDirection: 'row', backgroundColor: colors.backgroundSubtle, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  segment: {
    minHeight: 44,
    minWidth: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  segmentOn: { backgroundColor: colors.surfaceRaised },
  listContent: { paddingBottom: spacing.xl, flexGrow: 1 },
  cardWrap: { paddingHorizontal: spacing.md },
  mapBody: { flex: 1 },
  mapCard: { padding: spacing.md, gap: spacing.xs },
});
