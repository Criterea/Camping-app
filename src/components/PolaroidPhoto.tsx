import { Text, View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Fonts, Spacing } from '@/theme';

type Props = {
  uri: string;
  caption?: string | null;
  size?: number;
  rotation?: number;
  style?: ViewStyle;
};

export function PolaroidPhoto({ uri, caption, size = 160, rotation = 0, style }: Props) {
  const frame = size + Spacing.md * 2;
  return (
    <View
      style={[
        styles.frame,
        { width: frame, transform: [{ rotate: `${rotation}deg` }] },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        style={{ width: size, height: size, backgroundColor: Colors.paperEdge }}
        contentFit="cover"
        transition={150}
      />
      <View style={styles.captionWrap}>
        {caption ? (
          <Text style={styles.caption} numberOfLines={2}>
            {caption}
          </Text>
        ) : (
          <View style={styles.captionPlaceholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#FFFDF6',
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 2, height: 4 },
    elevation: 4,
  },
  captionWrap: {
    marginTop: Spacing.sm,
    minHeight: 22,
    justifyContent: 'center',
  },
  caption: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    color: Colors.ink,
    textAlign: 'center',
  },
  captionPlaceholder: {
    height: 1,
  },
});
