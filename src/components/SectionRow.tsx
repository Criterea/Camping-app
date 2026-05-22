import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Fonts, Spacing, Radius } from '@/theme';
import { getPreset } from '@/section-types';
import type { Section } from '@/lib/db';

type Props = {
  section: Section;
  photoCount: number;
  thumbnailUris: string[];
  index: number;
  onPress: () => void;
};

export function SectionRow({ section, photoCount, thumbnailUris, index, onPress }: Props) {
  const preset = getPreset(section.type);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.iconBubble, { backgroundColor: preset.tint }]}>
        <Text style={styles.iconEmoji}>{preset.emoji}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.chapterLabel}>Chapter {index + 1} · {preset.label}</Text>
        <Text style={styles.title} numberOfLines={1}>{section.title}</Text>
        <Text style={styles.count}>
          {photoCount === 0
            ? 'No photos yet'
            : `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`}
        </Text>
      </View>
      <View style={styles.thumbStack}>
        {thumbnailUris.slice(0, 3).map((uri, i) => (
          <Image
            key={`${uri}-${i}`}
            source={{ uri }}
            style={[
              styles.thumb,
              { right: i * 14, zIndex: 3 - i, transform: [{ rotate: `${(i - 1) * 4}deg` }] },
            ]}
            contentFit="cover"
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paperLight,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.10,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  rowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconEmoji: {
    fontSize: 26,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  chapterLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.inkFaint,
    marginBottom: 2,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.ink,
  },
  count: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.inkSoft,
    marginTop: 2,
  },
  thumbStack: {
    width: 60,
    height: 60,
    marginLeft: Spacing.sm,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: Colors.paperEdge,
    borderWidth: 2,
    borderColor: '#FFFDF6',
    top: 8,
  },
});
