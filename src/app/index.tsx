import { useCallback, useState } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { listTrips, countPhotosForTrip, listTripPhotos, type Trip } from '@/lib/db';
import { TripCoverCard } from '@/components/TripCoverCard';
import { FAB } from '@/components/FAB';
import { PaperBackground } from '@/components/PaperBackground';
import { Colors, Fonts, Spacing } from '@/theme';

type TripWithMeta = {
  trip: Trip;
  photoCount: number;
  recentPhotoUri: string | null;
};

export default function Home() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithMeta[]>([]);

  const load = useCallback(async () => {
    const list = await listTrips();
    const withMeta = await Promise.all(
      list.map(async (trip) => {
        const [photoCount, recents] = await Promise.all([
          countPhotosForTrip(trip.id),
          listTripPhotos(trip.id, 1),
        ]);
        return { trip, photoCount, recentPhotoUri: recents[0]?.local_uri ?? null };
      }),
    );
    setTrips(withMeta);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <PaperBackground>
      <FlatList
        data={trips}
        keyExtractor={(item) => String(item.trip.id)}
        renderItem={({ item }) => (
          <TripCoverCard
            trip={item.trip}
            photoCount={item.photoCount}
            recentPhotoUri={item.recentPhotoUri}
            onPress={() => router.push(`/trip/${item.trip.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>YOUR JOURNAL</Text>
            <Text style={styles.title}>Trips & Adventures</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>An empty journal</Text>
            <Text style={styles.emptyText}>
              Start your first trip with the button below.
            </Text>
          </View>
        }
      />
      <FAB label="New Trip" onPress={() => router.push('/trip/new')} />
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: Spacing.lg,
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
    fontSize: 32,
    fontWeight: '700',
    color: Colors.ink,
  },
  empty: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    fontStyle: 'italic',
    color: Colors.inkSoft,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    color: Colors.inkFaint,
    textAlign: 'center',
  },
});
