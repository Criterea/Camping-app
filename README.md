# Trail Journal

A personal camping & adventure journal for iPhone. Each trip is a "journal entry" you fill with chapters — Day Logs, Meals, Camp, Wildlife, or anything custom — and photos taken in-app that also save to your iPhone Photos library.

Built with Expo (React Native + TypeScript). Distributed via Expo Go — no Apple Developer account, no App Store.

## Run it on your iPhone (first time)

1. **On your iPhone:** install **Expo Go** from the App Store (free).
2. **On this computer:**

   ```powershell
   npm install   # first time only
   npx expo start
   ```

3. Make sure your iPhone is on the same Wi-Fi as this computer. Open the **Camera** app on your phone and point it at the QR code in the terminal. Tap the banner — it opens in Expo Go.
   - If your phone and computer are on different networks, run `npx expo start --tunnel` instead. Tunnel mode is slower but works anywhere.

4. The first launch sets up the local database. Tap **New Trip** and you're in.

## How it's structured

| File | What it does |
|---|---|
| `src/app/_layout.tsx` | Root navigation stack |
| `src/app/index.tsx` | Home — list of trips as scrapbook covers |
| `src/app/trip/new.tsx` | Create a trip |
| `src/app/trip/[id]/index.tsx` | Trip detail — list of chapters |
| `src/app/trip/[id]/section/new.tsx` | Create a chapter (pick a type) |
| `src/app/trip/[id]/section/[sectionId]/index.tsx` | Chapter detail — photo grid |
| `src/app/trip/[id]/section/[sectionId]/camera.tsx` | In-app camera (saves to Photos library) |
| `src/lib/db.ts` | SQLite schema + CRUD for trips, sections, photos |
| `src/lib/photo-store.ts` | Copies captured photos into app storage and into your iPhone Photos library |
| `src/components/` | TripCoverCard, SectionRow, PolaroidPhoto, FAB, PaperBackground |
| `src/theme.ts` | Paper/ink colors, serif fonts, spacing |
| `src/section-types.ts` | The five preset chapter types (Day, Meals, Camp, Wildlife, Custom) |

## Sharing it with friends (free, no App Store)

Friends install **Expo Go** on their iPhone, then load your project. Two paths:

- **Local Wi-Fi (instant, only works when you're nearby):** they scan the QR code from your `npx expo start` terminal.
- **Anywhere (recommended):** publish an update with [EAS Update](https://docs.expo.dev/eas-update/getting-started/). Free tier covers this. After you publish, friends open a link in Expo Go and the app loads.

  ```powershell
  npm install --global eas-cli
  eas login        # create a free Expo account if you don't have one
  eas update:configure
  eas update --branch production --message "first share"
  ```

  This prints a link / QR code your friends open inside Expo Go. Whenever you make changes, run `eas update ...` again and they'll pull the new version.

## Data lives on the device

Trips, chapters, and photo records live in a local SQLite database. The actual photo files live in two places:

- A copy in the app's documents directory (used by the journal UI).
- A copy in your iPhone Photos library (so the photo is still there if you ever delete the app).

There is no cloud backup yet. Losing the phone or deleting the app means losing the journal entries (the photos in your Photos library survive). When you're ready for backup or cross-device sync, the simplest add is iCloud (via a development build) or a Supabase backend.

## Things to add next

- iCloud / cloud backup
- Edit existing trip / chapter
- GPS tagging photos & a trip map
- Reorder chapters & photos by drag
- Stats / "achievements" (nights camped, photos taken, etc.)
- A proper date picker instead of typed dates
