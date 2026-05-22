import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createSection, type SectionType } from '@/lib/db';
import { SECTION_PRESETS } from '@/section-types';
import { PaperBackground } from '@/components/PaperBackground';
import { Colors, Fonts, Spacing, Radius } from '@/theme';

export default function NewSection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = Number(id);
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<SectionType>('day');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const preset = SECTION_PRESETS.find((p) => p.type === selectedType)!;
  const effectiveTitle = title.trim() || preset.label;

  async function save() {
    if (!Number.isFinite(tripId)) return;
    setSaving(true);
    try {
      const sectionId = await createSection({
        trip_id: tripId,
        type: selectedType,
        title: effectiveTitle,
      });
      router.replace(`/trip/${tripId}/section/${sectionId}`);
    } catch (err) {
      Alert.alert('Could not save', String(err));
      setSaving(false);
    }
  }

  return (
    <PaperBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>A new chapter</Text>
          <Text style={styles.sub}>Pick what kind of page this is.</Text>

          <View style={styles.grid}>
            {SECTION_PRESETS.map((p) => {
              const active = p.type === selectedType;
              return (
                <Pressable
                  key={p.type}
                  onPress={() => setSelectedType(p.type)}
                  style={[
                    styles.tile,
                    active && { borderColor: p.tint, backgroundColor: '#FFFDF6' },
                  ]}
                >
                  <View style={[styles.tileEmoji, { backgroundColor: p.tint }]}>
                    <Text style={styles.tileEmojiText}>{p.emoji}</Text>
                  </View>
                  <Text style={styles.tileLabel}>{p.label}</Text>
                  <Text style={styles.tileDesc}>{p.description}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Chapter Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={preset.label}
            placeholderTextColor={Colors.inkFaint}
            style={styles.input}
          />
          <Text style={styles.fieldHint}>
            Leave blank to use "{preset.label}".
          </Text>

          <Pressable
            onPress={save}
            disabled={saving}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonLabel}>
              {saving ? 'Saving…' : 'Add Chapter'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
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
  sub: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 14,
    color: Colors.inkSoft,
    marginBottom: Spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  tile: {
    width: '47%',
    backgroundColor: Colors.paperLight,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.paperEdge,
    padding: Spacing.md,
    minHeight: 110,
  },
  tileEmoji: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  tileEmojiText: {
    fontSize: 20,
  },
  tileLabel: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
  tileDesc: {
    fontFamily: Fonts.serif,
    fontSize: 12,
    color: Colors.inkSoft,
    marginTop: 2,
  },
  fieldLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.inkFaint,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.paperLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: Colors.ink,
  },
  fieldHint: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 12,
    color: Colors.inkFaint,
    marginTop: Spacing.xs,
  },
  button: {
    backgroundColor: Colors.accentDeep,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonLabel: {
    color: Colors.paperLight,
    fontFamily: Fonts.serif,
    fontSize: 17,
    fontWeight: '600',
  },
});
