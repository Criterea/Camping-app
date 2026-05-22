import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import {
  listAllRoutePoints,
  listTrips,
  type RoutePoint,
  type Trip,
} from '@/lib/db';
import { Colors, Fonts, Spacing } from '@/theme';

const POLY_COLORS = ['#5E4824', '#B96A3D', '#6B7F4F', '#4F6B5C', '#D4A24A', '#8B6F3F'];

type Bounds = {
  center: { latitude: number; longitude: number };
  delta: number;
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
    delta: Math.max(maxLat - minLat, maxLng - minLng, 0.01),
  };
}

function deltaToZoom(delta: number): number {
  return Math.max(2, Math.min(18, Math.round(Math.log2(360 / Math.max(delta, 0.001)))));
}

export default function Explore() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [ts, ps] = await Promise.all([listTrips(), listAllRoutePoints()]);
      setTrips(ts);
      setRoutePoints(ps);
      setLoading(false);
    })();
  }, []);

  const data = useMemo(() => {
    const pinTrips = trips.filter(
      (t): t is Trip & { latitude: number; longitude: number } =>
        t.latitude != null && t.longitude != null,
    );
    const grouped = new Map<number, RoutePoint[]>();
    for (const p of routePoints) {
      const arr = grouped.get(p.trip_id) ?? [];
      arr.push(p);
      grouped.set(p.trip_id, arr);
    }
    const polylines = trips
      .map((t, i) => {
        const points = grouped.get(t.id);
        if (!points || points.length < 2) return null;
        return {
          tripId: t.id,
          coordinates: points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
          color: POLY_COLORS[i % POLY_COLORS.length],
        };
      })
      .filter((x): x is { tripId: number; coordinates: { latitude: number; longitude: number }[]; color: string } => x !== null);

    const allCoords = [
      ...pinTrips.map((t) => ({ latitude: t.latitude, longitude: t.longitude })),
      ...polylines.flatMap((p) => p.coordinates),
    ];
    return { pinTrips, polylines, bounds: computeBounds(allCoords) };
  }, [trips, routePoints]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Explore' }} />
        <ActivityIndicator color={Colors.accentDeep} />
      </View>
    );
  }

  if (!data.bounds) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Explore' }} />
        <Text style={styles.emptyTitle}>Nothing on the map yet</Text>
        <Text style={styles.emptyText}>
          Add a location to a trip or record a route, then come back here.
        </Text>
      </View>
    );
  }

  const cameraPosition = {
    coordinates: data.bounds.center,
    zoom: deltaToZoom(data.bounds.delta),
  };

  const polylines = data.polylines.map((p) => ({
    coordinates: p.coordinates,
    color: p.color,
    width: 4,
  }));

  const markers = data.pinTrips.map((t) => ({
    id: String(t.id),
    coordinates: { latitude: t.latitude, longitude: t.longitude },
    title: t.title,
    snippet: t.location ?? undefined,
  }));

  function onMarkerClick(e: { id?: string } | undefined) {
    const id = e?.id;
    if (id) router.push(`/trip/${id}`);
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Explore' }} />
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          polylines={polylines}
          markers={markers.map((m) => ({
            id: m.id,
            coordinates: m.coordinates,
            title: m.title,
            systemImage: 'mappin.circle.fill',
          }))}
          onMarkerClick={onMarkerClick}
        />
      ) : (
        <GoogleMaps.View
          style={{ flex: 1 }}
          cameraPosition={cameraPosition}
          polylines={polylines}
          markers={markers.map((m) => ({
            id: m.id,
            coordinates: m.coordinates,
            title: m.title,
            snippet: m.snippet,
          }))}
          onMarkerClick={onMarkerClick}
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
