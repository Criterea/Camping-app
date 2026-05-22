import { useCallback, useState } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  deleteTrip,
  getTrip,
  listPhotos,
  listSections,
  type Section,
  type Trip,
} from '@/lib/db';
import { SectionRow } from '@/components/SectionRow';
import { FAB } from '@/components/FAB';
import { PaperBackground } from '@/components/PaperBackground';
import { Colors, Fonts, Spacing } from '@/theme';

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

  const load = useCallback(async () => {
    if (!Number.isFinite(tripId)) return;
    const [t, list] = await Promise.all([getTrip(tripId), listSections(tripId)]);
    setTrip(t);
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
    Alert.alert('Delete trip?', 'This removes the trip and all its chapters & photo records. Photos in your iPhone Photos library are not deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTrip(tripId);
          router.back();
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
            <Pressable onPress={onDelete} hitSlop={8}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
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
    </PaperBackground>
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
  sectionHeading: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: Spacing.sm,
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
  deleteText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.danger,
  },
});
