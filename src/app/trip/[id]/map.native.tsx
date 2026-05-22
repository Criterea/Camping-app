import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import {
  getTrip,
  listRoutePoints,
  listWaypoints,
  type RoutePoint,
  type Trip,
  type Waypoint,
} from '@/lib/db';
import { Colors, Fonts, Spacing } from '@/theme';

type Bounds = {
  center: { latitude: number; longitude: number };
  latDelta: number;
  lngDelta: number;
};

function computeBounds(points: { latitude: number; longitude: number }[]): Bounds | null {
  if (points.length === 0) return null;
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;
  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }
  return {
    center: { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2 },
    latDelta: Math.max(maxLat - minLat, 0.01),
    lngDelta: Math.max(maxLng - minLng, 0.01),
  };
}

function deltaToZoom(delta: number): number {
  return Math.max(2, Math.min(18, Math.round(Math.log2(360 / Math.max(delta, 0.001)))));
}

export default function TripMap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = Number(id);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(tripId)) return;
    (async () => {
      const [t, pts, wps] = await Promise.all([
        getTrip(tripId),
        listRoutePoints(tripId),
        listWaypoints(tripId),
      ]);
      setTrip(t);
      setPoints(pts);
      setWaypoints(wps);
      setLoading(false);
    })();
  }, [tripId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accentDeep} />
      </View>
    );
  }

  const allCoords = [
    ...points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    ...waypoints.map((w) => ({ latitude: w.latitude, longitude: w.longitude })),
  ];
  const bounds = computeBounds(allCoords);

  if (!bounds) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: trip?.title ?? 'Map' }} />
        <Text style={styles.emptyTitle}>Nothing to show yet</Text>
        <Text style={styles.emptyText}>
          Start recording or mark a waypoint to see this trip on a map.
        </Text>
      </View>
    );
  }

  const cameraPosition = {
    coordinates: bounds.center,
    zoom: deltaToZoom(Math.max(bounds.latDelta, bounds.lngDelta)),
  };

  const polyline = points.length >= 2
    ? [{
        coordinates: points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        color: Colors.accentDeep,
        width: 4,
      }]
    : [];

  const markers = waypoints.map((w) => ({
    coordinates: { latitude: w.latitude, longitude: w.longitude },
    title: w.name,
    systemImage: 'mappin.circle.fill',
  }));

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: trip?.title ?? 'Map' }} />
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          polylines={polyline}
          markers={markers}
        />
      ) : (
        <GoogleMaps.View
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          polylines={polyline}
          markers={markers.map((m) => ({
            coordinates: m.coordinates,
            title: m.title,
          }))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.paper,
  },
  emptyTitle: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: Colors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
});
