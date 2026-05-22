# Handoff notes

Brief Claude with this file at the start of a new session: `read HANDOFF.md`.

## What this is

`trail-journal` — Expo SDK 54 / React Native 0.81 app. Slug `trail-journal`, EAS project `d60f24ce-740d-48e5-b9b3-d4b739f81271`, owner `criterea`. Web is auto-deployed to https://trail-journal.expo.app via `eas deploy`.

Important: AGENTS.md pins SDK 54 docs (`https://docs.expo.dev/versions/v54.0.0/`). Read them before writing Expo code — APIs differ from later SDKs.

## Stack & key choices

- expo-router (file-based, `src/app/`). Typed routes enabled; when adding a new route, types regenerate when Metro runs. Until then, cast with `as never` (see `src/app/index.tsx` Map button).
- expo-sqlite, migrated through `SCHEMA_VERSION` in `src/lib/db.ts`. Currently at v3. Add migrations as `if (current < N)` blocks.
- expo-file-system new API (`File`, `Directory`, `Paths`) for photo storage — default in SDK 54.
- expo-location with `expo-task-manager` for background route recording. Task defined in `src/lib/location-task.ts`, imported once from `_layout.tsx` so it registers at app start.
- expo-maps for native maps (AppleMaps on iOS, GoogleMaps on Android). Web has no map — use `.web.tsx` split (see `src/app/trip/[id]/map.{native,web}.tsx`, `src/app/explore.{native,web}.tsx`).
- react-native-draggable-flatlist for photo reordering.
- Single PromptModal component for text input modals.

## What works on web vs native

| Feature | Web | Native |
|---|---|---|
| Trip / chapter / photo CRUD | ✅ | ✅ |
| Photo from library + EXIF geotag | ✅ | ✅ |
| Camera capture + live GPS geotag | ❌ (`Camera not available`) | ✅ |
| Drag-reorder photos | ⚠️ may not gesture | ✅ |
| GPS "Use my location" autofill on trip create/edit | ⚠️ depends on browser geolocation | ✅ |
| Route recording (background) | ❌ | ✅ (foreground service on Android, background indicator on iOS) |
| Waypoints | ❌ | ✅ |
| Trip map / Explore map | ⚠️ list fallback | ✅ |

`expo-maps`, `expo-task-manager` background tracking, and `react-native-draggable-flatlist` require a **native dev build** — Expo Go won't work. Build with `eas build --profile development --platform ios` (or android).

## Routes

- `/` Home — trip list, "Map" button in header → `/explore`
- `/explore` All trips on a map (native) / summary list (web)
- `/trip/new` Create trip (modal) — title, location, dates, notes, GPS button
- `/trip/[id]` Trip detail — header, Drive tracking panel, waypoints, chapters list
- `/trip/[id]/edit` Edit trip (modal)
- `/trip/[id]/map` This trip's route + waypoints (native map / web list)
- `/trip/[id]/section/new` Create chapter (modal)
- `/trip/[id]/section/[sectionId]` Chapter detail — drag-reorderable photo list
- `/trip/[id]/section/[sectionId]/edit` Edit chapter
- `/trip/[id]/section/[sectionId]/camera` Camera capture (fullScreenModal, native-only)

## Schema (v3)

```
trips(id, title, location, start_date, end_date, cover_photo_uri, notes,
      latitude, longitude, is_tracking, created_at)
sections(id, trip_id, type, title, notes, order_index, created_at)
photos(id, section_id, local_uri, media_library_id, caption, taken_at,
       order_index, latitude, longitude)
trip_route_points(id, trip_id, latitude, longitude, accuracy, recorded_at)
trip_waypoints(id, trip_id, name, latitude, longitude, notes, recorded_at)
```

Only one trip has `is_tracking = 1` at a time. The background task reads that to know where to insert points.

## Common commands

```bash
npm run web                                     # local dev (http://localhost:8081)
npx tsc --noEmit                                # type check
npx expo-doctor                                 # SDK + deps sanity check
npx expo export -p web --output-dir dist-web    # build web bundle
npx eas deploy --export-dir dist-web --prod     # publish to https://trail-journal.expo.app
eas build --profile development --platform ios  # native dev build (needed for camera/maps/tracking)
```

## Last session — recent commits

- `7f8c788` add Explore screen: overview map of all trips
- `19d45f8` add route recording, waypoints, photo geotag, map view
- `24e29e5` add trip/section edit, GPS autofill, drag-reorder photos, web camera fallback
- `de2f248` downgrade to Expo SDK 54

Web filtering note: `*.expo.app` is blocked on the user's work network. Don't bother opening the deployed URL during work hours; commit + push and tell them the URL.

## Known follow-ups / not yet done

- **Native dev build** has never been generated this session. Background tracking, expo-maps, and photo-camera-with-geotag are unverified on a real device.
- **Trip export / share** — discussed, deferred ("Skip for now").
- **Photo lightbox** — tapping a photo just opens a metadata Alert. A real fullscreen viewer would be nicer.
- **Map marker tap on Android (GoogleMaps)** — wired the same way as iOS, but the `onMarkerClick` event shape on `expo-maps@0.12` for GoogleMaps wasn't tested end-to-end.
- **Daily journal entries** — text-only "what we did today" notes per day. Schema not designed.
- **`as never` cast in `src/app/index.tsx`** for the `/explore` Map button — drop it after Metro regenerates `.expo/types/router.d.ts`.
- **`.claude/settings.local.json`** is tracked; ignore the permission-list churn in git status.
- **eas-cli is in devDependencies** — `expo-doctor` flags this, low priority.

## User preferences observed

- Moves fast — defaults to "do it" rather than reviewing options when given a recommendation.
- Wants commits + deploys to GitHub (`Criterea/Camping-app`, master branch) at the end of each feature round.
- Prefers concise responses over long explanations.
- Doesn't need URLs spelled out for the deployed app at work (filtered network).
