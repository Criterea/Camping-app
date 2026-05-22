import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  deletePhoto,
  deleteSection,
  getSection,
  listPhotos,
  updatePhotoCaption,
  type Photo,
  type Section,
} from '@/lib/db';
import { savePhoto, deletePhotoFile } from '@/lib/photo-store';
import { getPreset } from '@/section-types';
import { PaperBackground } from '@/components/PaperBackground';
import { FAB } from '@/components/FAB';
import { CaptionEditor } from '@/components/CaptionEditor';
import { Colors, Fonts, Spacing, Radius } from '@/theme';

const screenWidth = Dimensions.get('window').width;
const COL_GAP = Spacing.sm;
const TILE_SIZE = (screenWidth - Spacing.lg * 2 - COL_GAP) / 2;

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
    });
    if (result.canceled || !result.assets.length) return;
    try {
      await savePhoto({
        sectionId: sId,
        tripId,
        sourceUri: result.assets[0].uri,
        saveToLibrary: false,
      });
      await load();
    } catch (err) {
      Alert.alert('Could not save photo', String(err));
    }
  }

  function onPhotoPress(photo: Photo) {
    Alert.alert('Photo', photo.caption ?? 'No caption', [
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

  return (
    <PaperBackground>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={onDeleteSection} hitSlop={8}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={photos}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.columnWrap}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPhotoPress(item)}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
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
        )}
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
      <CaptionEditor
        visible={editingPhoto !== null}
        initialValue={editingPhoto?.caption ?? ''}
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
  columnWrap: {
    gap: COL_GAP,
    marginBottom: COL_GAP,
  },
  tile: {
    width: TILE_SIZE,
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
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  image: {
    width: '100%',
    height: TILE_SIZE,
    backgroundColor: Colors.paperEdge,
  },
  captionStrip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  captionText: {
    fontFamily: Fonts.serif,
    fontSize: 12,
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
  deleteText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.danger,
  },
});
