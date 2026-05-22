import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '@/theme';

type Props = {
  visible: boolean;
  initialValue: string;
  onCancel: () => void;
  onSave: (value: string) => void;
};

export function CaptionEditor({ visible, initialValue, onCancel, onSave }: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropPress} onPress={onCancel} />
        <View style={styles.card}>
          <Text style={styles.title}>Caption</Text>
          <Text style={styles.subtitle}>
            A short caption shown under the photo.
          </Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="What's happening in this photo?"
            placeholderTextColor={Colors.inkFaint}
            style={styles.input}
            autoFocus
            multiline
            maxLength={140}
          />
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.btn,
                styles.btnGhost,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.btnGhostLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(value.trim())}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.btnPrimaryLabel}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: Spacing.xl,
  },
  backdropPress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.paperLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    padding: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ink,
  },
  subtitle: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 13,
    color: Colors.inkSoft,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: '#FFFDF6',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: Colors.ink,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  btn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnGhostLabel: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    color: Colors.inkSoft,
  },
  btnPrimary: {
    backgroundColor: Colors.accentDeep,
  },
  btnPrimaryLabel: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.paperLight,
  },
});
