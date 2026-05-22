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
import * as Location from 'expo-location';
import { getTrip, updateTrip } from '@/lib/db';
import { PaperBackground } from '@/components/PaperBackground';
import { Colors, Fonts, Spacing, Radius } from '@/theme';

function formatPlace(p: Location.LocationGeocodedAddress | undefined): string {
  if (!p) return '';
  const parts = [p.name, p.city ?? p.subregion, p.region, p.country].filter(
    (s, i, arr): s is string =>
      !!s && (i === 0 || !arr.slice(0, i).includes(s as string)),
  );
  return parts.join(', ');
}

export default function EditTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = Number(id);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Number.isFinite(tripId)) return;
      const t = await getTrip(tripId);
      if (cancelled || !t) return;
      setTitle(t.title);
      setLocation(t.location ?? '');
      setStartDate(t.start_date ?? '');
      setEndDate(t.end_date ?? '');
      setNotes(t.notes ?? '');
      setLatitude(t.latitude);
      setLongitude(t.longitude);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Location off', 'Allow location access to auto-fill where you are.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const place = formatPlace(places[0]);
        if (place) setLocation(place);
      } catch {
        // reverse geocode failed: coords still saved
      }
    } catch (err) {
      Alert.alert('Could not get location', String(err));
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    if (!title.trim()) {
      Alert.alert('Title needed', 'Give your trip a name.');
      return;
    }
    setSaving(true);
    try {
      await updateTrip(tripId, {
        title: title.trim(),
        location: location.trim() || null,
        start_date: startDate.trim() || null,
        end_date: endDate.trim() || null,
        notes: notes.trim() || null,
        latitude,
        longitude,
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
          <Text style={styles.heading}>Edit trip</Text>

          <Field
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Three nights in the Grampians"
          />
          <Field
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="Park, mountain, river…"
          />
          <Pressable
            onPress={useCurrentLocation}
            disabled={locating}
            style={({ pressed }) => [styles.gpsButton, pressed && { opacity: 0.85 }]}
          >
            {locating ? (
              <ActivityIndicator color={Colors.accentDeep} />
            ) : (
              <Text style={styles.gpsLabel}>
                📍 {latitude !== null ? 'Update from current location' : 'Use my current location'}
              </Text>
            )}
          </Pressable>
          {latitude !== null && longitude !== null ? (
            <Text style={styles.coords}>
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </Text>
          ) : null}
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
              {saving ? 'Saving…' : 'Save Changes'}
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
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  inputStyle?: any;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
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
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[styles.input, inputStyle]}
      />
    </View>
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
  gpsButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.paperLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.paperEdge,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  gpsLabel: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.accentDeep,
    fontWeight: '600',
  },
  coords: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.inkFaint,
    marginBottom: Spacing.lg,
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
