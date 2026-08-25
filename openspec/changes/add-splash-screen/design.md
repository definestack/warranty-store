## Context

See `proposal.md — Why` for motivation and `specs/app-launch/spec.md` for the behaviour
contract.

The constraints that shape the approach:

- `src/App.tsx` already gates rendering on `initDatabase()` with a three-state machine
  (`loading` / `ready` / `error`) held in `useState` inside the `App` component. The
  loading and error branches render bare `<Text>` inside a themed `<View>`. There is no
  retry path — a failure is terminal until the user force-quits.
- The theme is only available *inside* `ThemeProvider`, and the language only inside
  `LocaleProvider`. Both wrap `AppShell`, so an in-app boot screen can be themed and
  localized, but a native splash cannot — it must be configured with static colours.
- `assets/splash-icon.png` exists but is unreferenced and is Expo's default placeholder
  artwork. Every other asset in `assets/` is also placeholder art.
- `expo-splash-screen` is not installed. From Expo SDK 51 onward the splash is configured
  through that package's config plugin, not the legacy `expo.splash` key in `app.json`.
- The repo requires TDD for `db/`, `services/`, `utils/` and store logic, and has no
  screen or component tests at all. Anything worth testing here must therefore live
  outside the component tree.
- CI runs `expo-doctor` and `expo export --platform android`, so the plugin entry has to be
  valid and the referenced asset has to exist.

## Goals / Non-Goals

**Goals:**

- One source of truth for the splash artwork and for the two background colours, shared by
  the native splash and the in-app boot states.
- Move launch state (status, error, retry) out of the `App` component so it is unit
  testable without rendering React, consistent with "avoid business logic inside screens".
- Keep the change reversible: removing the plugin entry and the dependency restores current
  behaviour exactly.

**Non-Goals:**

- No animation work. The only motion is the platform's own splash fade-out.
- No component or screen test infrastructure is introduced; the branded frame stays a
  presentational component with no logic to test.
- No change to `initDatabase()` itself, to migration behaviour, or to error semantics
  beyond making a failure retryable.
- No new artwork is produced (see the flagged assumption in the proposal).

## Decisions

### Use the `expo-splash-screen` config plugin, not the legacy `expo.splash` key

The plugin form is the supported configuration path on SDK 54 and is the only one that
supports a `dark` variant with a distinct background colour. The legacy `expo.splash` key
is deprecated and offers no theme variant, which the spec requires.

Plugin entry in `app.json`:

```json
["expo-splash-screen", {
  "image": "./assets/splash-icon.png",
  "imageWidth": 200,
  "resizeMode": "contain",
  "backgroundColor": "#FFFBFE",
  "dark": { "image": "./assets/splash-icon.png", "backgroundColor": "#1C1B1F" }
}]
```

`resizeMode: "contain"` satisfies the "no stretching or cropping" requirement.
`#FFFBFE` and `#1C1B1F` are the MD3 `background` values the app already renders
(`MD3LightTheme` / `MD3DarkTheme` neutral99 / neutral10, surfaced through
`src/theme/palette.ts`), so the splash background equals the first screen's background and
there is no colour step at handoff.

*Alternative considered:* a hand-written `android/` splash theme. Rejected — the project is
managed-workflow and hand-edited native config would be regenerated away.

*Accepted limitation:* these two colours are duplicated as literals in `app.json` because
native config cannot import from TypeScript. A comment in `src/theme/palette.ts` will
point at `app.json` so the pair is not silently drifted apart.

### Hold the splash by preventing auto-hide, and hide on the settled status

`SplashScreen.preventAutoHideAsync()` is called once at module scope in `src/App.tsx`
(before any component renders) and its rejection is swallowed — it rejects harmlessly if
the splash has already hidden, and a rejected floating promise must not surface as an
unhandled rejection at boot. `SplashScreen.hideAsync()` is then called once the boot status
leaves `loading` — on `ready` **and** on `error`, which is what keeps a database failure
from stranding the user on the splash forever.

`hideAsync` is invoked from the `onLayout` of the already-rendered root view rather than
directly in the status effect, so the first frame of real UI is committed underneath before
the splash lifts. That is what makes "no intermediate blank frame" true rather than merely
likely.

*Alternative considered:* `NavigationContainer`'s `onReady`. Rejected — it only fires on the
`ready` path, so the error path would need a second, different mechanism.

*Alternative considered:* a minimum splash duration. Rejected — the spec explicitly forbids
an artificial delay, and `initDatabase()` on an already-migrated database is fast.

### Move boot state into a Zustand store, not `useState` in `App`

New `src/store/bootstrapStore.ts`:

```ts
type BootStatus = 'loading' | 'ready' | 'error';

interface BootstrapState {
  status: BootStatus;
  error: string | null;
  initialize: () => Promise<void>;  // no-op while an attempt is already running
  retry: () => Promise<void>;
}
```

`App` subscribes and calls `initialize()` from an effect; the failure state's retry button
calls `retry()`, which resets to `loading` and runs initialization again. Putting this in a
store rather than component state means the retry/error/idempotence logic is covered by a
plain Jest test in the same style as `itemsStore.test.ts` and `notificationsStore.test.ts`
— no component-test infrastructure needed, and the TDD requirement is met honestly.

`initialize()` guards against concurrent runs so a double-tap on retry cannot start two
initializations. `initDatabase()` is already idempotent (singleton connection), so a repeat
call after failure is safe.

*Alternative considered:* keeping `useState` and extracting only a `shouldHideSplash(status)`
predicate for testing. Rejected — that tests a one-line boolean while leaving the retry
logic, the part that can actually be wrong, untested.

### One presentational `AppSplash` component, three uses

New `src/components/AppSplash.tsx` renders the logo (`require('../../assets/splash-icon.png')`)
centred on `theme.background` at the same 200px width the plugin uses, and accepts optional
children rendered below the logo. The boot state passes the existing
`common.initializingDatabase` text; the error state passes the existing
`common.databaseError` text plus a Paper `Button` wired to `retry()`. Because both the
plugin and this component point at the same asset file, swapping the artwork updates all
three launch states with no code change — which is the replaceability requirement.

Matching the plugin's `imageWidth: 200` in the component is what makes the handoff seamless;
the two values are coupled and a comment will say so.

### Reuse existing i18n keys, add one

`common.initializingDatabase` and `common.databaseError` already exist in `en`, `es`, `fr`
and `de` and keep their current wording. Only a retry label is new (`common.retry`), added
to all four locales.

## Risks / Trade-offs

- **The shipped splash shows Expo's placeholder artwork.** → Called out explicitly in the
  proposal and designed as a single-file swap; the asset path is referenced in exactly two
  places (`app.json` and `AppSplash.tsx`), both pointing at the same file.
- **Adding `expo-splash-screen` requires a native rebuild;** an existing dev client will not
  pick up the plugin and will appear to show no splash. → Install with `npx expo install`
  so the SDK-matched version is chosen, and verify with `npm run android` (a real local
  build, per the current `android` script), not by reloading an old client.
- **Splash colours are duplicated between `app.json` and the MD3 theme.** → Cross-referencing
  comments in both places; a mismatch is visible immediately on launch, so it fails loudly
  rather than silently.
- **`preventAutoHideAsync` without a matching `hideAsync` would hang the app on the splash
  forever.** → `hideAsync` is driven by the status leaving `loading`, which covers both the
  success and the failure path, and this is asserted by the store test plus a manual
  forced-failure check in the task list.
- **Retry re-enters `initDatabase()` after a failure.** → The connection is a singleton and
  `runMigrations` is version-guarded and transactional, so a re-run resumes from the last
  applied version rather than reapplying anything. No new data risk.
- **`expo-doctor` / `expo export` in CI could reject a malformed plugin entry.** → Both are
  run locally as explicit tasks before the change is considered done.

## Migration Plan

No data migration — no schema, AsyncStorage key, or persisted shape changes.

Deployment is a normal native rebuild: install the dependency, add the plugin entry, then
`npm run android`. Rollback is removing the plugin entry from `app.json`, uninstalling
`expo-splash-screen`, and reverting `src/App.tsx`; nothing persisted survives the revert,
so there is no cleanup step.
