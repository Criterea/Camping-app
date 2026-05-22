import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  getTrip,
  listWaypoints,
  routeStats,
  type RouteStats,
  type Trip,
  type Waypoint,
} from '@/lib/db';
import { PaperBackground } from '@/components/PaperBackground';
import { Colors, Fonts, Spacing, Radius } from '@/theme';

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

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function TripMap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = Number(id);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [stats, setStats] = useState<RouteStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(tripId)) return;
    (async () => {
      const [t, wps, st] = await Promise.all([
        getTrip(tripId),
        listWaypoints(tripId),
        routeStats(tripId),
      ]);
      setTrip(t);
      setWaypoints(wps);
      setStats(st);
      setLoading(false);
    })();
  }, [tripId]);

  if (loading) {
    return (
      <PaperBackground>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accentDeep} />
        </View>
      </PaperBackground>
    );
  }

  return (
    <PaperBackground>
      <Stack.Screen options={{ title: trip?.title ?? 'Map' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Route & waypoints</Text>
        <Text style={styles.note}>
          Interactive maps only run in the iOS / Android app — here's the data.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route</Text>
          {stats && stats.pointCount > 0 ? (
            <>
              <Stat label="Distance" value={formatDistance(stats.distanceMeters)} />
              <Stat label="Duration" value={formatDuration(stats.durationSeconds)} />
              <Stat label="Points" value={String(stats.pointCount)} />
              {stats.startedAt ? (
                <Stat label="Started" value={formatDate(stats.startedAt)} />
              ) : null}
              {stats.endedAt ? (
                <Stat label="Ended" value={formatDate(stats.endedAt)} />
              ) : null}
            </>
          ) : (
            <Text style={styles.empty}>No route recorded.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Waypoints</Text>
          {waypoints.length === 0 ? (
            <Text style={styles.empty}>No waypoints marked.</Text>
          ) : (
            waypoints.map((w) => (
              <View key={w.id} style={styles.waypointRow}>
                <Text style={styles.waypointName}>{w.name}</Text>
                <Text style={styles.waypointMeta}>
                  {w.latitude.toFixed(5)}, {w.longitude.toFixed(5)}
                </Text>
                <Text style={styles.waypointMeta}>{formatDate(w.recorded_at)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </PaperBackground>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  heading: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.ink,
  },
  note: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 13,
    color: Colors.inkSoft,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.paperLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  statLabel: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.inkFaint,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    color: Colors.ink,
  },
  empty: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 14,
    color: Colors.inkFaint,
  },
  waypointRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.paperEdge,
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
});
