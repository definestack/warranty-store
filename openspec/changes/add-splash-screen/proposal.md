## Why

The app has no splash screen at all. `app.json` declares no splash configuration and
`expo-splash-screen` is not installed, so launching Warranty Store shows the OS default
blank window, then a bare `Initializing database…` line of text on a plain background
while migrations run, then the Home screen — three unbranded visual states before the user
sees the app. The database gate in `App.tsx` already exists; it simply has no branded
presentation, and its error state is equally bare.

## What Changes

- Add a **native splash screen** (via the `expo-splash-screen` config plugin) shown from
  process start: the app logo centred on the theme background, with a dark variant so the
  splash matches the system theme instead of flashing white in dark mode.
- **Hold the native splash** until `initDatabase()` settles, so the user never sees a bare
  frame between the native splash and the first rendered screen. The splash hides on both
  success and failure — a database error must not leave the splash up forever.
- Replace the plain `Initializing database…` text state in `App.tsx` with a **branded boot
  screen** that repeats the splash composition (same logo, same background), so hiding the
  native splash is visually seamless rather than a jump. It only becomes visible if
  initialization outlives the native splash.
- Give the **database error state** the same branded frame, keeping the existing
  `common.databaseError` message and adding a retry action so a transient failure is
  recoverable without force-quitting the app.
- The splash is **static**; the only motion is the platform's own splash fade-out. No
  custom animation, per the project's "avoid heavy custom animations" guideline.

Not in scope: new artwork, a wordmark or tagline, an onboarding/welcome flow, and any
change to what `initDatabase()` actually does.

**Assumption to flag:** the splash reuses `assets/splash-icon.png`, which is still Expo's
default placeholder graphic (a grid with concentric circles) — as are `icon.png` and the
adaptive-icon layers. The shield logo in `docs/design/app-design.png` has never been
exported to `assets/`. This change therefore ships placeholder branding, and is
deliberately built so that dropping a real logo into `assets/splash-icon.png` later
updates both the native splash and the in-app boot screen with no code change.

No breaking changes. One new dependency (`expo-splash-screen`, an Expo-maintained module
matched to the SDK), which requires a native rebuild of the dev client.

## Capabilities

### New Capabilities
- `app-launch`: what the user sees from process start until the first app screen is
  interactive — the native splash and its theme variants, how long it is held, the branded
  boot state while the database initializes, and the branded error state with retry when
  initialization fails.

### Modified Capabilities
<!-- None. The only existing spec, `settings`, governs Settings and navigation controls
     and is unaffected by launch behaviour. -->

## Impact

- **Dependencies**: adds `expo-splash-screen` (install with `npx expo install` so the
  SDK 54-matched version is chosen). Expo-managed, no third-party framework introduced.
  Requires a new native build — `npm run android` rebuilds; an existing dev client will
  not pick it up.
- **Config**: `app.json` gains the `expo-splash-screen` plugin entry with `image`,
  `backgroundColor`, `resizeMode` and a `dark` variant. Light background `#FFFBFE` and
  dark `#1C1B1F` are the MD3 `background` values the app already renders
  (`MD3LightTheme`/`MD3DarkTheme` via `src/theme/palette.ts`), so the splash and the first
  screen share one colour.
- **App entry**: `src/App.tsx` — `preventAutoHideAsync()` at module scope, `hideAsync()`
  once the database status leaves `loading`, and the loading/error branches re-rendered
  through the new component. The provider order and the existing `initDatabase()` gate are
  unchanged.
- **components/**: new `AppSplash` (branded logo-on-background frame, reused by the boot
  and error states).
- **i18n**: existing `common.initializingDatabase` and `common.databaseError` are kept; one
  new retry key added to `en`, `es`, `fr`, `de`.
- **Data / schema / business logic**: none. No SQLite, migration, AsyncStorage, notification
  or backup behaviour is touched.
- **CI**: `npx expo-doctor` and `npx expo export --platform android` must still pass with
  the new plugin; `npm run typecheck`, `npm run lint` and `npm test` are unaffected except
  for the new unit test covering the splash-hide decision.
