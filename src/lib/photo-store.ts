import { File, Directory, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { createPhoto, setTripCoverIfMissing, type Photo } from './db';

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

function uniqueName(ext = 'jpg'): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

function extFromUri(uri: string): string {
  const m = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (!m) return 'jpg';
  const ext = m[1].toLowerCase();
  if (ext === 'jpeg') return 'jpg';
  return ext;
}

export type SavedPhoto = {
  photoId: number;
  localUri: string;
  mediaLibraryId: string | null;
};

export async function savePhoto(opts: {
  sectionId: number;
  tripId: number;
  sourceUri: string;
  saveToLibrary: boolean;
  latitude?: number | null;
  longitude?: number | null;
  takenAt?: string | null;
}): Promise<SavedPhoto> {
  const dir = photosDir();
  const name = uniqueName(extFromUri(opts.sourceUri));
  const source = new File(opts.sourceUri);
  const dest = new File(dir, name);
  await source.copy(dest);

  let mediaLibraryId: string | null = null;
  if (opts.saveToLibrary) {
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (perm.granted) {
        const asset = await MediaLibrary.createAssetAsync(opts.sourceUri);
        mediaLibraryId = asset.id;
      }
    } catch {
      // non-fatal: app copy still exists
    }
  }

  const photoId = await createPhoto({
    section_id: opts.sectionId,
    local_uri: dest.uri,
    media_library_id: mediaLibraryId,
    latitude: opts.latitude ?? null,
    longitude: opts.longitude ?? null,
    taken_at: opts.takenAt ?? null,
  });

  try {
    await setTripCoverIfMissing(opts.tripId, dest.uri);
  } catch {}

  return { photoId, localUri: dest.uri, mediaLibraryId };
}

export async function deletePhotoFile(photo: Photo): Promise<void> {
  try {
    const file = new File(photo.local_uri);
    if (file.exists) file.delete();
  } catch {}
}

// --- EXIF helpers ---

type ExifLike = Record<string, unknown> | null | undefined;

function dmsToDecimal(value: unknown, ref: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const sign = typeof ref === 'string' && (ref === 'S' || ref === 'W') ? -1 : 1;
    return value * (value < 0 ? 1 : sign);
  }
  if (Array.isArray(value) && value.length >= 3) {
    const [d, m, s] = value.map((n) => (typeof n === 'number' ? n : Number(n)));
    if (![d, m, s].every(Number.isFinite)) return null;
    const decimal = Math.abs(d) + m / 60 + s / 3600;
    const sign = typeof ref === 'string' && (ref === 'S' || ref === 'W') ? -1 : 1;
    return decimal * sign;
  }
  return null;
}

export function extractExifLocation(exif: ExifLike): { latitude: number; longitude: number } | null {
  if (!exif) return null;
  const lat = dmsToDecimal(exif.GPSLatitude, exif.GPSLatitudeRef);
  const lng = dmsToDecimal(exif.GPSLongitude, exif.GPSLongitudeRef);
  if (lat == null || lng == null) return null;
  if (lat === 0 && lng === 0) return null;
  return { latitude: lat, longitude: lng };
}

export function extractExifDate(exif: ExifLike): string | null {
  if (!exif) return null;
  const raw = exif.DateTimeOriginal ?? exif.DateTime ?? exif.DateTimeDigitized;
  if (typeof raw !== 'string') return null;
  // EXIF format: "YYYY:MM:DD HH:MM:SS"
  const m = raw.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}
