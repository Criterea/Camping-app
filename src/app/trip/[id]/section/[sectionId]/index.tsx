import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import {
  deletePhoto,
  deleteSection,
  getSection,
  listPhotos,
  reorderPhotos,
  updatePhotoCaption,
  type Photo,
  type Section,
} from '@/lib/db';
import {
  savePhoto,
  deletePhotoFile,
  extractExifLocation,
  extractExifDate,
} from '@/lib/photo-store';
import { getPreset } from '@/section-types';
import { PaperBackground } from '@/components/PaperBackground';
import { FAB } from '@/components/FAB';
import { PromptModal } from '@/components/PromptModal';
import { Colors, Fonts, Spacing, Radius } from '@/theme';

const screenWidth = Dimensions.get('window').width;
const TILE_WIDTH = screenWidth - Spacing.lg * 2;
const TILE_HEIGHT = Math.round(TILE_WIDTH * 0.66);

function formatPhotoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SectionDetail() {
  const { id, sectionId } = useLocalSearchParams<{
    id: string;
    sectionId: string;
  }>();
  const tripId = Number(id);
  const sId = Number(sectionId);
  const router = useRouter();

  const [section, setSection] = useState<Section | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(sId)) return;
    const [s, ps] = await Promise.all([getSection(sId), listPhotos(sId)]);
    setSection(s);
    setPhotos(ps);
  }, [sId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const preset = section ? getPreset(section.type) : null;

  function onAddPhoto() {
    if (Platform.OS === 'web') {
      pickFromLibrary();
      return;
    }
    Alert.alert('Add a photo', undefined, [
      {
        text: 'Take Photo',
        onPress: () =>
          router.push(`/trip/${tripId}/section/${sId}/camera`),
      },
      {
        text: 'Pick from Library',
        onPress: pickFromLibrary,
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      exif: true,
    });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    try {
      const exifLocation = extractExifLocation(asset.exif);
      const takenAt = extractExifDate(asset.exif);
      let latitude = exifLocation?.latitude ?? null;
      let longitude = exifLocation?.longitude ?? null;
      if (latitude == null && Platform.OS !== 'web') {
        try {
          const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
          if (last) {
            latitude = last.coords.latitude;
            longitude = last.coords.longitude;
          }
        } catch {
          // ignore
        }
      }
      await savePhoto({
        sectionId: sId,
        tripId,
        sourceUri: asset.uri,
        saveToLibrary: false,
        latitude,
        longitude,
        takenAt,
      });
      await load();
    } catch (err) {
      Alert.alert('Could not save photo', String(err));
    }
  }

  function onPhotoPress(photo: Photo) {
    const parts: string[] = [];
    if (photo.caption) parts.push(photo.caption);
    parts.push(`Taken ${formatPhotoDate(photo.taken_at)}`);
    if (photo.latitude != null && photo.longitude != null) {
      parts.push(`At ${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}`);
    }
    Alert.alert('Photo', parts.join('\n'), [
      {
        text: 'Edit Caption',
        onPress: () => setEditingPhoto(photo),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDeletePhoto(photo),
      },
      { text: 'Done', style: 'cancel' },
    ]);
  }

  async function saveCaption(value: string) {
    if (!editingPhoto) return;
    await updatePhotoCaption(editingPhoto.id, value);
    setEditingPhoto(null);
    await load();
  }

  function confirmDeletePhoto(photo: Photo) {
    Alert.alert('Delete this photo?', 'This removes it from the journal. Photos in your iPhone Photos library are not deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePhoto(photo.id);
          await deletePhotoFile(photo);
          await load();
        },
      },
    ]);
  }

  function onDeleteSection() {
    Alert.alert('Delete chapter?', 'Removes the chapter and its photos from the journal. iPhone Photos library is unaffected.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          for (const p of photos) await deletePhotoFile(p);
          await deleteSection(sId);
          router.back();
        },
      },
    ]);
  }

  async function onDragEnd(data: Photo[]) {
    setPhotos(data);
    try {
      await reorderPhotos(sId, data.map((p) => p.id));
    } catch (err) {
      Alert.alert('Could not save order', String(err));
      await load();
    }
  }

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Photo>) => (
    <ScaleDecorator>
      <Pressable
        onPress={() => onPhotoPress(item)}
        onLongPress={drag}
        delayLongPress={200}
        disabled={isActive}
        style={({ pressed }) => [
          styles.tile,
          (pressed || isActive) && styles.tilePressed,
        ]}
      >
        <Image
          source={{ uri: item.local_uri }}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
        {item.caption ? (
          <View style={styles.captionStrip}>
            <Text style={styles.captionText} numberOfLines={2}>
              {item.caption}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </ScaleDecorator>
  );

  return (
    <PaperBackground>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push(`/trip/${tripId}/section/${sId}/edit`)}
                hitSlop={8}
              >
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
              <Pressable onPress={onDeleteSection} hitSlop={8}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <DraggableFlatList
        data={photos}
        keyExtractor={(item) => String(item.id)}
        onDragEnd={({ data }) => onDragEnd(data)}
        renderItem={renderItem}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          section && preset ? (
            <View style={styles.header}>
              <View style={[styles.chapterBadge, { backgroundColor: preset.tint }]}>
                <Text style={styles.chapterBadgeEmoji}>{preset.emoji}</Text>
                <Text style={styles.chapterBadgeLabel}>
                  {preset.label.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.title}>{section.title}</Text>
              {section.notes ? (
                <Text style={styles.notes}>{section.notes}</Text>
              ) : null}
              {photos.length > 1 ? (
                <Text style={styles.reorderHint}>
                  Tip: long-press a photo to reorder.
                </Text>
              ) : null}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>An empty page.</Text>
            <Text style={styles.emptyHint}>
              Tap "Add Photo" to fill this chapter.
            </Text>
          </View>
        }
      />
      <FAB label="Add Photo" onPress={onAddPhoto} icon="📷" />
      <PromptModal
        visible={editingPhoto !== null}
        title="Caption"
        subtitle="A short caption shown under the photo."
        placeholder="What's happening in this photo?"
        initialValue={editingPhoto?.caption ?? ''}
        multiline
        maxLength={140}
        onCancel={() => setEditingPhoto(null)}
        onSave={saveCaption}
      />
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 120,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    paddingVertical: Spacing.lg,
  },
  chapterBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: Spacing.md,
  },
  chapterBadgeEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  chapterBadgeLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#FFFDF6',
    fontWeight: '700',
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.ink,
    lineHeight: 34,
  },
  notes: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    color: Colors.ink,
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  reorderHint: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 12,
    color: Colors.inkFaint,
    marginTop: Spacing.md,
  },
  tile: {
    width: TILE_WIDTH,
    marginBottom: Spacing.md,
    backgroundColor: '#FFFDF6',
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tilePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  image: {
    width: '100%',
    height: TILE_HEIGHT,
    backgroundColor: Colors.paperEdge,
  },
  captionStrip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  captionText: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: Colors.ink,
  },
  empty: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontStyle: 'italic',
    color: Colors.inkSoft,
    marginBottom: Spacing.sm,
  },
  emptyHint: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: Colors.inkFaint,
    textAlign: 'center',
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
