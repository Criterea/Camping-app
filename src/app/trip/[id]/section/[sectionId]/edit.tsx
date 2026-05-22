import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSection, updateSection, type SectionType } from '@/lib/db';
import { SECTION_PRESETS } from '@/section-types';
import { PaperBackground } from '@/components/PaperBackground';
import { Colors, Fonts, Spacing, Radius } from '@/theme';

export default function EditSection() {
  const { sectionId } = useLocalSearchParams<{ id: string; sectionId: string }>();
  const sId = Number(sectionId);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<SectionType>('day');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Number.isFinite(sId)) return;
      const s = await getSection(sId);
      if (cancelled || !s) return;
      setType(s.type);
      setTitle(s.title);
      setNotes(s.notes ?? '');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sId]);

  const preset = SECTION_PRESETS.find((p) => p.type === type)!;

  async function save() {
    if (!title.trim()) {
      Alert.alert('Title needed', 'Give the chapter a title.');
      return;
    }
    setSaving(true);
    try {
      await updateSection(sId, {
        type,
        title: title.trim(),
        notes: notes.trim() || null,
      });
      router.back();
    } catch (err) {
      Alert.alert('Could not save', String(err));
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PaperBackground>
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.accentDeep} />
        </View>
      </PaperBackground>
    );
  }

  return (
    <PaperBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Edit chapter</Text>

          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.grid}>
            {SECTION_PRESETS.map((p) => {
              const active = p.type === type;
              return (
                <Pressable
                  key={p.type}
                  onPress={() => setType(p.type)}
                  style={[
                    styles.tile,
                    active && { borderColor: p.tint, backgroundColor: '#FFFDF6' },
                  ]}
                >
                  <View style={[styles.tileEmoji, { backgroundColor: p.tint }]}>
                    <Text style={styles.tileEmojiText}>{p.emoji}</Text>
                  </View>
                  <Text style={styles.tileLabel}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={preset.label}
            placeholderTextColor={Colors.inkFaint}
            style={styles.input}
          />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything you want to remember…"
            placeholderTextColor={Colors.inkFaint}
            multiline
            style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
          />

          <Pressable
            onPress={save}
            disabled={saving}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonLabel}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </PaperBackground>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  heading: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: Spacing.xl,
  },
  fieldLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.inkFaint,
    marginBottom: Spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tile: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: Colors.paperLight,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.paperEdge,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  tileEmoji: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  tileEmojiText: {
    fontSize: 18,
  },
  tileLabel: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    color: Colors.ink,
    fontWeight: '600',
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
