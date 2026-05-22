import * as SQLite from 'expo-sqlite';

const DB_NAME = 'trailjournal.db';
const SCHEMA_VERSION = 3;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        location TEXT,
        start_date TEXT,
        end_date TEXT,
        cover_photo_uri TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
        local_uri TEXT NOT NULL,
        media_library_id TEXT,
        caption TEXT,
        taken_at TEXT NOT NULL DEFAULT (datetime('now')),
        order_index INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_sections_trip ON sections(trip_id);
      CREATE INDEX IF NOT EXISTS idx_photos_section ON photos(section_id);
    `);
  }

  if (current < 2) {
    await db.execAsync(`
      ALTER TABLE trips ADD COLUMN latitude REAL;
      ALTER TABLE trips ADD COLUMN longitude REAL;
    `);
  }

  if (current < 3) {
    await db.execAsync(`
      ALTER TABLE trips ADD COLUMN is_tracking INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE photos ADD COLUMN latitude REAL;
      ALTER TABLE photos ADD COLUMN longitude REAL;
      CREATE TABLE IF NOT EXISTS trip_route_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy REAL,
        recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_route_points_trip ON trip_route_points(trip_id, recorded_at);
      CREATE TABLE IF NOT EXISTS trip_waypoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        notes TEXT,
        recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_waypoints_trip ON trip_waypoints(trip_id);
    `);
  }

  if (current < SCHEMA_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }

  return db;
}

export type Trip = {
  id: number;
  title: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_photo_uri: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  is_tracking: number;
  created_at: string;
};

export type SectionType = 'meals' | 'day' | 'camp' | 'wildlife' | 'custom';

export type Section = {
  id: number;
  trip_id: number;
  type: SectionType;
  title: string;
  notes: string | null;
  order_index: number;
  created_at: string;
};

export type Photo = {
  id: number;
  section_id: number;
  local_uri: string;
  media_library_id: string | null;
  caption: string | null;
  taken_at: string;
  order_index: number;
  latitude: number | null;
  longitude: number | null;
};

export type RoutePoint = {
  id: number;
  trip_id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
};

export type Waypoint = {
  id: number;
  trip_id: number;
  name: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  recorded_at: string;
};

// --- Trips ---

export async function listTrips(): Promise<Trip[]> {
  const db = await getDb();
  return db.getAllAsync<Trip>(
    'SELECT * FROM trips ORDER BY COALESCE(start_date, created_at) DESC',
  );
}

export async function getTrip(id: number): Promise<Trip | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Trip>('SELECT * FROM trips WHERE id = ?', id);
  return row ?? null;
}

export type TripInput = {
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export async function createTrip(input: TripInput): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO trips (title, location, start_date, end_date, notes, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.title,
    input.location ?? null,
    input.start_date ?? null,
    input.end_date ?? null,
    input.notes ?? null,
    input.latitude ?? null,
    input.longitude ?? null,
  );
  return result.lastInsertRowId;
}

export async function updateTrip(id: number, input: TripInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE trips
     SET title = ?, location = ?, start_date = ?, end_date = ?, notes = ?,
         latitude = ?, longitude = ?
     WHERE id = ?`,
    input.title,
    input.location ?? null,
    input.start_date ?? null,
    input.end_date ?? null,
    input.notes ?? null,
    input.latitude ?? null,
    input.longitude ?? null,
    id,
  );
}

export async function updateTripCover(tripId: number, coverUri: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE trips SET cover_photo_uri = ? WHERE id = ?', coverUri, tripId);
}

export async function setTripCoverIfMissing(tripId: number, coverUri: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE trips SET cover_photo_uri = ? WHERE id = ? AND cover_photo_uri IS NULL',
    coverUri,
    tripId,
  );
}

export async function deleteTrip(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM trips WHERE id = ?', id);
}

// --- Tracking ---

export async function startTracking(tripId: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE trips SET is_tracking = 0 WHERE is_tracking = 1');
    await db.runAsync('UPDATE trips SET is_tracking = 1 WHERE id = ?', tripId);
  });
}

export async function stopTracking(tripId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE trips SET is_tracking = 0 WHERE id = ?', tripId);
}

export async function getActiveTrackingTripId(): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM trips WHERE is_tracking = 1 LIMIT 1',
  );
  return row?.id ?? null;
}

// --- Route points ---

export async function addRoutePoint(input: {
  trip_id: number;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  recorded_at?: string;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO trip_route_points (trip_id, latitude, longitude, accuracy, recorded_at)
     VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')))`,
    input.trip_id,
    input.latitude,
    input.longitude,
    input.accuracy ?? null,
    input.recorded_at ?? null,
  );
}

export async function listRoutePoints(tripId: number): Promise<RoutePoint[]> {
  const db = await getDb();
  return db.getAllAsync<RoutePoint>(
    'SELECT * FROM trip_route_points WHERE trip_id = ? ORDER BY recorded_at ASC',
    tripId,
  );
}

export async function listAllRoutePoints(): Promise<RoutePoint[]> {
  const db = await getDb();
  return db.getAllAsync<RoutePoint>(
    'SELECT * FROM trip_route_points ORDER BY trip_id ASC, recorded_at ASC',
  );
}

export type RouteStats = {
  pointCount: number;
  distanceMeters: number;
  durationSeconds: number;
  startedAt: string | null;
  endedAt: string | null;
};

export async function routeStats(tripId: number): Promise<RouteStats> {
  const points = await listRoutePoints(tripId);
  if (points.length === 0) {
    return {
      pointCount: 0,
      distanceMeters: 0,
      durationSeconds: 0,
      startedAt: null,
      endedAt: null,
    };
  }
  let distance = 0;
  for (let i = 1; i < points.length; i++) {
    distance += haversineMeters(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude,
    );
  }
  const startedAt = points[0].recorded_at;
  const endedAt = points[points.length - 1].recorded_at;
  const duration =
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000;
  return {
    pointCount: points.length,
    distanceMeters: distance,
    durationSeconds: Math.max(0, duration),
    startedAt,
    endedAt,
  };
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// --- Waypoints ---

export async function addWaypoint(input: {
  trip_id: number;
  name: string;
  latitude: number;
  longitude: number;
  notes?: string | null;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO trip_waypoints (trip_id, name, latitude, longitude, notes)
     VALUES (?, ?, ?, ?, ?)`,
    input.trip_id,
    input.name,
    input.latitude,
    input.longitude,
    input.notes ?? null,
  );
  return result.lastInsertRowId;
}

export async function listWaypoints(tripId: number): Promise<Waypoint[]> {
  const db = await getDb();
  return db.getAllAsync<Waypoint>(
    'SELECT * FROM trip_waypoints WHERE trip_id = ? ORDER BY recorded_at ASC',
    tripId,
  );
}

export async function deleteWaypoint(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM trip_waypoints WHERE id = ?', id);
}

// --- Sections ---

export async function listSections(tripId: number): Promise<Section[]> {
  const db = await getDb();
  return db.getAllAsync<Section>(
    'SELECT * FROM sections WHERE trip_id = ? ORDER BY order_index ASC, created_at ASC',
    tripId,
  );
}

export async function getSection(id: number): Promise<Section | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Section>('SELECT * FROM sections WHERE id = ?', id);
  return row ?? null;
}

export async function createSection(input: {
  trip_id: number;
  type: SectionType;
  title: string;
  notes?: string | null;
}): Promise<number> {
  const db = await getDb();
  const max = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(order_index) as max_order FROM sections WHERE trip_id = ?',
    input.trip_id,
  );
  const next = (max?.max_order ?? -1) + 1;
  const result = await db.runAsync(
    `INSERT INTO sections (trip_id, type, title, notes, order_index)
     VALUES (?, ?, ?, ?, ?)`,
    input.trip_id,
    input.type,
    input.title,
    input.notes ?? null,
    next,
  );
  return result.lastInsertRowId;
}

export async function updateSection(
  id: number,
  input: { type: SectionType; title: string; notes?: string | null },
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sections SET type = ?, title = ?, notes = ? WHERE id = ?`,
    input.type,
    input.title,
    input.notes ?? null,
    id,
  );
}

export async function deleteSection(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sections WHERE id = ?', id);
}

// --- Photos ---

export async function listPhotos(sectionId: number): Promise<Photo[]> {
  const db = await getDb();
  return db.getAllAsync<Photo>(
    'SELECT * FROM photos WHERE section_id = ? ORDER BY order_index ASC, taken_at ASC',
    sectionId,
  );
}

export async function listTripPhotos(tripId: number, limit = 4): Promise<Photo[]> {
  const db = await getDb();
  return db.getAllAsync<Photo>(
    `SELECT photos.* FROM photos
     JOIN sections ON sections.id = photos.section_id
     WHERE sections.trip_id = ?
     ORDER BY photos.taken_at DESC
     LIMIT ?`,
    tripId,
    limit,
  );
}

export async function createPhoto(input: {
  section_id: number;
  local_uri: string;
  media_library_id?: string | null;
  caption?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  taken_at?: string | null;
}): Promise<number> {
  const db = await getDb();
  const max = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(order_index) as max_order FROM photos WHERE section_id = ?',
    input.section_id,
  );
  const next = (max?.max_order ?? -1) + 1;
  const result = await db.runAsync(
    `INSERT INTO photos
       (section_id, local_uri, media_library_id, caption, latitude, longitude, taken_at, order_index)
     VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), ?)`,
    input.section_id,
    input.local_uri,
    input.media_library_id ?? null,
    input.caption ?? null,
    input.latitude ?? null,
    input.longitude ?? null,
    input.taken_at ?? null,
    next,
  );
  return result.lastInsertRowId;
}

export async function updatePhotoCaption(id: number, caption: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE photos SET caption = ? WHERE id = ?', caption, id);
}

export async function reorderPhotos(sectionId: number, orderedIds: number[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(
        'UPDATE photos SET order_index = ? WHERE id = ? AND section_id = ?',
        i,
        orderedIds[i],
        sectionId,
      );
    }
  });
}

export async function deletePhoto(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM photos WHERE id = ?', id);
}

export async function countPhotosForTrip(tripId: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM photos
     JOIN sections ON sections.id = photos.section_id
     WHERE sections.trip_id = ?`,
    tripId,
  );
  return row?.n ?? 0;
}
