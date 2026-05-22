import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Fonts, Spacing, Radius } from '@/theme';
import type { Trip } from '@/lib/db';

type Props = {
  trip: Trip;
  photoCount: number;
  recentPhotoUri?: string | null;
  onPress: () => void;
};

export function TripCoverCard({ trip, photoCount, recentPhotoUri, onPress }: Props) {
  const cover = trip.cover_photo_uri ?? recentPhotoUri ?? null;
  const dateLine = formatDateRange(trip.start_date, trip.end_date);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.coverWrap}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.cover, styles.coverEmpty]}>
            <Text style={styles.coverEmptyText}>No photos yet</Text>
          </View>
        )}
        <View style={styles.tapeTopLeft} />
        <View style={styles.tapeTopRight} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {trip.title}
        </Text>
        {trip.location ? (
          <Text style={styles.location} numberOfLines={1}>
            {trip.location}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {dateLine ? <Text style={styles.meta}>{dateLine}</Text> : null}
          <Text style={[styles.meta, styles.metaRight]}>
            {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (s: string) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };
  if (start && end && start !== end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt((start ?? end)!);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.paperLight,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  coverWrap: {
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.paperEdge,
  },
  coverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmptyText: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 16,
    color: Colors.inkFaint,
  },
  tapeTopLeft: {
    position: 'absolute',
    top: -10,
    left: 24,
    width: 60,
    height: 22,
    backgroundColor: Colors.tape,
    opacity: 0.85,
    transform: [{ rotate: '-6deg' }],
  },
  tapeTopRight: {
    position: 'absolute',
    top: -10,
    right: 24,
    width: 60,
    height: 22,
    backgroundColor: Colors.tape,
    opacity: 0.85,
    transform: [{ rotate: '5deg' }],
  },
  body: {
    padding: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.ink,
  },
  location: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 14,
    color: Colors.inkSoft,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  meta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.inkFaint,
    letterSpacing: 0.5,
  },
  metaRight: {
    textAlign: 'right',
  },
});
