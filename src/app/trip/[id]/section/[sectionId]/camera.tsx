import { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { savePhoto } from '@/lib/photo-store';
import { Colors, Fonts } from '@/theme';

export default function CameraScreen() {
  const { id, sectionId } = useLocalSearchParams<{
    id: string;
    sectionId: string;
  }>();
  const tripId = Number(id);
  const sId = Number(sectionId);
  const router = useRouter();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturing, setCapturing] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Text style={styles.permTitle}>Camera not available</Text>
        <Text style={styles.permText}>
          The in-app camera only runs on iOS and Android. Use "Pick from Library"
          to add photos here.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.permButton, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.permButtonLabel}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color="#FFFDF6" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Text style={styles.permTitle}>Camera access</Text>
        <Text style={styles.permText}>
          Trail Journal needs the camera to capture photos for your trip pages.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => [styles.permButton, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.permButtonLabel}>Allow Camera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.permCancel}>Not now</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  async function capture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });
      if (!photo?.uri) throw new Error('No photo returned from camera');
      await savePhoto({
        sectionId: sId,
        tripId,
        sourceUri: photo.uri,
        saveToLibrary: true,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      Alert.alert('Could not save', String(err));
      setCapturing(false);
    }
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
            hitSlop={12}
          >
            <Text style={styles.iconButtonLabel}>✕</Text>
          </Pressable>
          <Pressable
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
            hitSlop={12}
          >
            <Text style={styles.iconButtonLabel}>⇄</Text>
          </Pressable>
        </View>
        <View style={styles.bottomRow}>
          <Pressable
            onPress={capture}
            disabled={capturing}
            style={({ pressed }) => [
              styles.shutterOuter,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <View style={[styles.shutterInner, capturing && { opacity: 0.6 }]} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bottomRow: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonLabel: {
    color: '#FFFDF6',
    fontSize: 22,
    fontWeight: '600',
  },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#FFFDF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFDF6',
  },
  permTitle: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFDF6',
    marginBottom: 12,
    textAlign: 'center',
  },
  permText: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    color: '#FFFDF6',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  permButtonLabel: {
    color: '#FFFDF6',
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '600',
  },
  permCancel: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: '#FFFDF6',
    opacity: 0.7,
    textDecorationLine: 'underline',
  },
});
