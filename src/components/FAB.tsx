import { Pressable, Text, StyleSheet, View, Platform } from 'react-native';
import { Colors, Fonts, Spacing } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  icon?: string;
};

export function FAB({ label, onPress, icon = '+' }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    left: Spacing.lg,
    alignItems: 'flex-end',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentDeep,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 6 },
    }),
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  icon: {
    color: Colors.paperLight,
    fontSize: 22,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  label: {
    color: Colors.paperLight,
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '600',
  },
});
