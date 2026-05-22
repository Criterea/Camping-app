import { useCallback, useState } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import * as Location from 'expo-location';
import {
  addWaypoint,
  deleteTrip,
  deleteWaypoint,
  getTrip,
  listPhotos,
  listSections,
  listWaypoints,
  routeStats,
  startTracking,
  stopTracking,
  type RouteStats,
  type Section,
  type Trip,
  type Waypoint,
} from '@/lib/db';
import {
  isBackgroundTrackingRunning,
  startBackgroundTracking,
  stopBackgroundTracking,
} from '@/lib/location-task';
import { SectionRow } from '@/components/SectionRow';
import { FAB } from '@/components/FAB';
import { PaperBackground } from '@/components/PaperBackground';
import { PromptModal } from '@/components/PromptModal';
import { Colors, Fonts, Spacing, Radius } from '@/theme';

type SectionWithMeta = {
  section: Section;
  photoCount: number;
  thumbnails: string[];
};

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = Number(id);
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [sections, setSections] = useState<SectionWithMeta[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [stats, setStats] = useState<RouteStats | null>(null);
  const [trackingRunning, setTrackingRunning] = useState(false);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [markingWaypoint, setMarkingWaypoint] = useState(false);
  const [waypointPrompt, setWaypointPrompt] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(tripId)) return;
    const [t, list, wps, st, running] = await Promise.all([
      getTrip(tripId),
      listSections(tripId),
      listWaypoints(tripId),
      routeStats(tripId),
      isBackgroundTrackingRunning(),
    ]);
    setTrip(t);
    setWaypoints(wps);
    setStats(st);
    setTrackingRunning(running && (t?.is_tracking ?? 0) === 1);
    const withMeta = await Promise.all(
      list.map(async (s) => {
        const photos = await listPhotos(s.id);
        return {
          section: s,
          photoCount: photos.length,
          thumbnails: photos.slice(-3).map((p) => p.local_uri),
        };
      }),
    );
    setSections(withMeta);
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function onDelete() {
    Alert.alert(
      'Delete trip?',
      'This removes the trip, all its chapters, waypoints, and the recorded route. Photos in your iPhone Photos library are not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (trackingRunning) {
              try {
                await stopBackgroundTracking();
              } catch {}
            }
            await deleteTrip(tripId);
            router.back();
          },
        },
      ],
    );
  }

  async function toggleTracking() {
    if (trackingBusy) return;
    setTrackingBusy(true);
    try {
      if (trackingRunning) {
        await stopBackgroundTracking();
        await stopTracking(tripId);
        setTrackingRunning(false);
      } else {
        await startTracking(tripId);
        await startBackgroundTracking();
        setTrackingRunning(true);
      }
    } catch (err) {
      await stopTracking(tripId);
      Alert.alert('Tracking', String(err instanceof Error ? err.message : err));
    } finally {
      setTrackingBusy(false);
      await load();
    }
  }

  async function markWaypoint() {
    if (markingWaypoint) return;
    if (Platform.OS === 'web') {
      Alert.alert('Not on web', 'Waypoints need GPS — open the app on your phone.');
      return;
    }
    setMarkingWaypoint(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Location off', 'Allow location to mark a waypoint.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setWaypointPrompt({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch (err) {
      Alert.alert('Could not get location', String(err));
    } finally {
      setMarkingWaypoint(false);
    }
  }

  async function saveWaypoint(name: string) {
    if (!waypointPrompt) return;
    const final = name.trim() || `Waypoint ${waypoints.length + 1}`;
    try {
      await addWaypoint({
        trip_id: tripId,
        name: final,
        latitude: waypointPrompt.latitude,
        longitude: waypointPrompt.longitude,
      });
      setWaypointPrompt(null);
      await load();
    } catch (err) {
      Alert.alert('Could not save waypoint', String(err));
    }
  }

  function confirmDeleteWaypoint(w: Waypoint) {
    Alert.alert(`Delete "${w.name}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWaypoint(w.id);
          await load();
        },
      },
    ]);
  }

  return (
    <PaperBackground>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push(`/trip/${tripId}/edit`)}
                hitSlop={8}
              >
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
              <Pressable onPress={onDelete} hitSlop={8}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <FlatList
        data={sections}
        keyExtractor={(item) => String(item.section.id)}
        renderItem={({ item, index }) => (
          <SectionRow
            section={item.section}
            photoCount={item.photoCount}
            thumbnailUris={item.thumbnails}
            index={index}
            onPress={() =>
              router.push(`/trip/${tripId}/section/${item.section.id}`)
            }
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          trip ? (
            <View style={styles.header}>
              <Text style={styles.eyebrow}>JOURNAL ENTRY</Text>
              <Text style={styles.title}>{trip.title}</Text>
              {trip.location ? (
                <Text style={styles.location}>{trip.location}</Text>
              ) : null}
              <DateLine start={trip.start_date} end={trip.end_date} />
              {trip.notes ? (
                <Text style={styles.notes}>{trip.notes}</Text>
              ) : null}

              <View style={styles.divider} />
              <Text style={styles.sectionHeading}>The Drive</Text>
              <TrackingPanel
                running={trackingRunning}
                busy={trackingBusy}
                stats={stats}
                onToggle={toggleTracking}
                onOpenMap={() => router.push(`/trip/${tripId}/map`)}
              />

              <View style={styles.subDivider} />
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionHeading}>Waypoints</Text>
                <Pressable
                  onPress={markWaypoint}
                  disabled={markingWaypoint}
                  style={({ pressed }) => [styles.markBtn, pressed && { opacity: 0.85 }]}
                >
                  {markingWaypoint ? (
                    <ActivityIndicator color={Colors.paperLight} />
                  ) : (
                    <Text style={styles.markBtnLabel}>📍 Mark here</Text>
                  )}
                </Pressable>
              </View>
              {waypoints.length === 0 ? (
                <Text style={styles.emptyInline}>
                  No waypoints yet. Mark places along the way — campsites, summits, lookouts.
                </Text>
              ) : (
                <View style={styles.waypointList}>
                  {waypoints.map((w) => (
                    <Pressable
                      key={w.id}
                      onLongPress={() => confirmDeleteWaypoint(w)}
                      style={({ pressed }) => [
                        styles.waypointRow,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={styles.waypointName}>{w.name}</Text>
                      <Text style={styles.waypointMeta}>
                        {w.latitude.toFixed(4)}, {w.longitude.toFixed(4)} ·{' '}
                        {formatDateShort(w.recorded_at)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.divider} />
              <Text style={styles.sectionHeading}>Chapters</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No chapters yet.</Text>
            <Text style={styles.emptyHint}>
              Add a chapter for meals, a day's events, the camp setup, wildlife,
              or anything else worth remembering.
            </Text>
          </View>
        }
      />
      <FAB
        label="Add Chapter"
        onPress={() => router.push(`/trip/${tripId}/section/new`)}
      />
      <PromptModal
        visible={waypointPrompt !== null}
        title="Mark this spot"
        subtitle={
          waypointPrompt
            ? `${waypointPrompt.latitude.toFixed(5)}, ${waypointPrompt.longitude.toFixed(5)}`
            : ''
        }
        placeholder="e.g. Camp 1, Summit cairn, Lunch spot"
        saveLabel="Save waypoint"
        onCancel={() => setWaypointPrompt(null)}
        onSave={saveWaypoint}
      />
    </PaperBackground>
  );
}

function TrackingPanel({
  running,
  busy,
  stats,
  onToggle,
  onOpenMap,
}: {
  running: boolean;
  busy: boolean;
  stats: RouteStats | null;
  onToggle: () => void;
  onOpenMap: () => void;
}) {
  const hasData = (stats?.pointCount ?? 0) > 0;
  return (
    <View>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, running && styles.statusDotActive]} />
        <Text style={styles.statusText}>
          {running ? 'Recording your route' : hasData ? 'Route saved' : 'Not recording'}
        </Text>
      </View>
      {hasData ? (
        <Text style={styles.statsLine}>
          {formatDistance(stats!.distanceMeters)} · {formatDuration(stats!.durationSeconds)} ·{' '}
          {stats!.pointCount} points
        </Text>
      ) : null}
      <View style={styles.trackingActions}>
        <Pressable
          onPress={onToggle}
          disabled={busy}
          style={({ pressed }) => [
            styles.trackBtn,
            running ? styles.trackBtnStop : styles.trackBtnStart,
            pressed && { opacity: 0.85 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={Colors.paperLight} />
          ) : (
            <Text style={styles.trackBtnLabel}>
              {running ? 'Stop recording' : 'Start recording'}
            </Text>
          )}
        </Pressable>
        {hasData ? (
          <Pressable
            onPress={onOpenMap}
            style={({ pressed }) => [
              styles.trackBtn,
              styles.trackBtnGhost,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.trackBtnGhostLabel}>View map</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function DateLine({ start, end }: { start: string | null; end: string | null }) {
  if (!start && !end) return null;
  const fmt = (s: string) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };
  const range =
    start && end && start !== end
      ? `${fmt(start)} – ${fmt(end)}`
      : fmt((start ?? end)!);
  return <Text style={styles.dates}>{range}</Text>;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m % 60}m`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  eyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.inkFaint,
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    fontWeight: '700',
    color: Colors.ink,
    lineHeight: 36,
  },
  location: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 16,
    color: Colors.inkSoft,
    marginTop: Spacing.xs,
  },
  dates: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.inkFaint,
    marginTop: Spacing.xs,
    letterSpacing: 0.5,
  },
  notes: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    color: Colors.ink,
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.paperEdge,
    marginVertical: Spacing.lg,
  },
  subDivider: {
    height: 1,
    backgroundColor: Colors.paperEdge,
    marginVertical: Spacing.md,
    opacity: 0.6,
  },
  sectionHeading: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.inkFaint,
    marginRight: Spacing.sm,
  },
  statusDotActive: {
    backgroundColor: Colors.success,
  },
  statusText: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    color: Colors.ink,
  },
  statsLine: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.inkSoft,
    marginBottom: Spacing.sm,
  },
  trackingActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  trackBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnStart: {
    backgroundColor: Colors.accentDeep,
  },
  trackBtnStop: {
    backgroundColor: Colors.danger,
  },
  trackBtnLabel: {
    color: Colors.paperLight,
    fontFamily: Fonts.serif,
    fontSize: 15,
    fontWeight: '600',
  },
  trackBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.paperEdge,
  },
  trackBtnGhostLabel: {
    color: Colors.ink,
    fontFamily: Fonts.serif,
    fontSize: 15,
    fontWeight: '600',
  },
  markBtn: {
    backgroundColor: Colors.accentDeep,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    minHeight: 34,
    justifyContent: 'center',
  },
  markBtnLabel: {
    color: Colors.paperLight,
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyInline: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 14,
    color: Colors.inkFaint,
    lineHeight: 20,
  },
  waypointList: {
    gap: Spacing.sm,
  },
  waypointRow: {
    backgroundColor: Colors.paperLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  waypointName: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ink,
  },
  waypointMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.inkFaint,
    marginTop: 2,
  },
  empty: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontStyle: 'italic',
    color: Colors.inkSoft,
    marginBottom: Spacing.sm,
  },
  emptyHint: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: Colors.inkFaint,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  editText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.accentDeep,
  },
  deleteText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.danger,
  },
});
