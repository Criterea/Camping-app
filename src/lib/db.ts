import * as SQLite from 'expo-sqlite';

const DB_NAME = 'trailjournal.db';
const SCHEMA_VERSION = 1;

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

export async function createTrip(input: {
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO trips (title, location, start_date, end_date, notes)
     VALUES (?, ?, ?, ?, ?)`,
    input.title,
    input.location ?? null,
    input.start_date ?? null,
    input.end_date ?? null,
    input.notes ?? null,
  );
  return result.lastInsertRowId;
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

export async function deleteSection(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sections WHERE id = ?', id);
}

// --- Photos ---

export async function listPhotos(sectionId: number): Promise<Photo[]> {
  const db = await getDb();
  return db.getAllAsync<Photo>(
    'SELECT * FROM photos WHERE section_id = ? ORDER BY taken_at ASC',
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
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO photos (section_id, local_uri, media_library_id, caption)
     VALUES (?, ?, ?, ?)`,
    input.section_id,
    input.local_uri,
    input.media_library_id ?? null,
    input.caption ?? null,
  );
  return result.lastInsertRowId;
}

export async function updatePhotoCaption(id: number, caption: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE photos SET caption = ? WHERE id = ?', caption, id);
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
