import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { addRoutePoint, getActiveTrackingTripId } from './db';

export const LOCATION_TASK_NAME = 'trail-journal-location';

if (Platform.OS !== 'web') {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.warn('[location-task] error', error);
      return;
    }
    const locations = (data as { locations?: Location.LocationObject[] })?.locations;
    if (!locations?.length) return;
    try {
      const tripId = await getActiveTrackingTripId();
      if (tripId == null) {
        await stopBackgroundTracking();
        return;
      }
      for (const loc of locations) {
        await addRoutePoint({
          trip_id: tripId,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? null,
          recorded_at: new Date(loc.timestamp).toISOString(),
        });
      }
    } catch (err) {
      console.warn('[location-task] write failed', err);
    }
  });
}

export async function startBackgroundTracking(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Route tracking is not supported on web.');
  }
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) {
    throw new Error('Location permission denied.');
  }
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) {
    throw new Error(
      'Background location permission denied. The route will only record while the app is open.',
    );
  }
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (started) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10000,
    distanceInterval: 25,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Trail Journal is recording your route',
      notificationBody: 'Tap to return to the app.',
      notificationColor: '#5E4824',
    },
  });
}

export async function stopBackgroundTracking(): Promise<void> {
  if (Platform.OS === 'web') return;
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

export async function isBackgroundTrackingRunning(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}
