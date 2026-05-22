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
  });

  // First photo for the trip becomes its cover (no-op if already set).
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
