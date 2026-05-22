import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  listAllRoutePoints,
  listTrips,
  routeStats,
  type RouteStats,
  type Trip,
} from '@/lib/db';
import { PaperBackground } from '@/components/PaperBackground';
import { Colors, Fonts, Spacing, Radius } from '@/theme';

type Row = {
  trip: Trip;
  stats: RouteStats;
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
}

export default function Explore() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const trips = await listTrips();
      await listAllRoutePoints();
      const withStats = await Promise.all(
        trips.map(async (t) => ({ trip: t, stats: await routeStats(t.id) })),
      );
      setRows(withStats);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <PaperBackground>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accentDeep} />
        </View>
      </PaperBackground>
    );
  }

  const withLocation = rows.filter(
    (r) => r.trip.latitude != null || r.stats.pointCount > 0,
  );

  return (
    <PaperBackground>
      <Stack.Screen options={{ title: 'Explore' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Where you've been</Text>
        <Text style={styles.note}>
          Interactive map only runs in the iOS / Android app — this is the list.
        </Text>

        {withLocation.length === 0 ? (
          <Text style={styles.empty}>
            No trips have a location or recorded route yet.
          </Text>
        ) : (
          withLocation.map(({ trip, stats }) => (
            <Pressable
              key={trip.id}
              onPress={() => router.push(`/trip/${trip.id}`)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.cardTitle}>{trip.title}</Text>
              {trip.location ? (
                <Text style={styles.cardLocation}>{trip.location}</Text>
              ) : null}
              {trip.latitude != null && trip.longitude != null ? (
                <Text style={styles.cardMeta}>
                  📍 {trip.latitude.toFixed(4)}, {trip.longitude.toFixed(4)}
                </Text>
              ) : null}
              {stats.pointCount > 0 ? (
                <Text style={styles.cardMeta}>
                  🛣 {formatDistance(stats.distanceMeters)} · {stats.pointCount} points
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </PaperBackground>
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
  empty: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 14,
    color: Colors.inkFaint,
  },
  card: {
    backgroundColor: Colors.paperLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
  },
  cardLocation: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 14,
    color: Colors.inkSoft,
    marginTop: 2,
  },
  cardMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.inkFaint,
    marginTop: Spacing.xs,
  },
});
