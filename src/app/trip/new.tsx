import { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { createTrip } from '@/lib/db';
import { PaperBackground } from '@/components/PaperBackground';
import { Colors, Fonts, Spacing, Radius } from '@/theme';

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function NewTrip() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) {
      Alert.alert('Title needed', 'Give your trip a name to start.');
      return;
    }
    setSaving(true);
    try {
      const id = await createTrip({
        title: title.trim(),
        location: location.trim() || null,
        start_date: startDate.trim() || null,
        end_date: endDate.trim() || null,
        notes: notes.trim() || null,
      });
      router.replace(`/trip/${id}`);
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>A new adventure</Text>
          <Text style={styles.sub}>Name it. Locate it. Begin the chapter.</Text>

          <Field
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Three nights in the Grampians"
            autoFocus
          />
          <Field
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="Park, mountain, river…"
          />
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Field
                label="Start"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.rowItem}>
              <Field
                label="End"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
              />
            </View>
          </View>
          <Field
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Plans, hopes, packing list…"
            multiline
            inputStyle={{ minHeight: 100, textAlignVertical: 'top' }}
          />

          <Pressable
            onPress={save}
            disabled={saving}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonLabel}>
              {saving ? 'Saving…' : 'Begin Trip'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </PaperBackground>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  inputStyle?: any;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  autoFocus,
  autoCapitalize,
  inputStyle,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.inkFaint}
        autoFocus={autoFocus}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[styles.input, inputStyle]}
      />
    </View>
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
  field: {
    marginBottom: Spacing.lg,
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
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  rowItem: {
    flex: 1,
  },
  button: {
    backgroundColor: Colors.accentDeep,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
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
