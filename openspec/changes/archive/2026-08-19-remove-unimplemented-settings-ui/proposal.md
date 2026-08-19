## Why

The Settings screen and the navigation drawer present three controls that do nothing when
tapped: a "Backup & Restore" row (`onPress={() => {}}`), a "Sign Out" button (no `onPress`
at all), and a drawer "Sign Out" item whose `rootNavigation.goBack()` has nothing to pop
because `MainTabs` is the root stack's initial and only bottom entry.

All three are placeholders for Phase 2 features that do not exist: there is no account
system and no Google Drive backup. The "Backup & Restore" row is actively misleading —
local backup export and restore *are* implemented and shipped, so a row bearing that exact
label and going nowhere reads as "backup is not supported here" while the two working rows
directly beneath it are named "Export Data" and "Import Backup".

## What Changes

- Remove the "Backup & Restore" row from the Settings "General" section. This row was a
  placeholder for Google Drive cloud backup (Phase 2), not for the local export/import
  that already works.
- Remove the "Sign Out" button from the bottom of the Settings screen.
- Remove the "Sign Out" item from the navigation drawer, along with the `rootNavigation`
  binding and `NativeStackNavigationProp` import that exist only to serve it.
- Remove the now-unreferenced i18n keys `settings.backupRestore`, `settings.signOut`, and
  `nav.signOut` from all four locale files (en, es, fr, de).

Not breaking: no exported signature, shared type, navigation route, or route param
changes. No persisted data is touched.

Explicitly **out of scope** (each is defensible on its own but does not belong in a
deletion-only change):

- Restructuring the Settings section headers (e.g. splitting a `BACKUP` section out of
  `GENERAL`). That is an addition, and mixing it in would stop the diff reading as one
  idea. Worth its own change afterwards.
- The drawer's greyed-out `disabled` items (Categories, Reminders, Reports, Help &
  Feedback) and the Categories/Reminders tabs that show a "coming soon" toast. These are
  honest unavailable-state affordances, not dead controls — they tell the user the
  feature is not ready instead of pretending to work.
- The stale "Warranty Tracker" product name in `settings.aboutApp` and
  `settings.importBackupInvalid` (the product is "Warranty Store"). Unrelated defect that
  happens to live in the same lines of the locale files.

## Capabilities

### New Capabilities
- `settings`: What the Settings screen and the app's account-related chrome present to the
  user — which controls appear, and the rule that a control is only shown when the feature
  behind it actually works. This is the first capability spec in the repo; `openspec/specs/`
  is currently empty.

### Modified Capabilities
<!-- None. No spec exists yet for this behaviour. -->

## Impact

Affected code (6 files, presentation layer only):

- `src/screens/SettingsScreen.tsx` — one `SettingsRow`, one `Pressable`, and the
  `signOut` / `signOutText` style rules.
- `src/navigation/AppDrawerContent.tsx` — the final `View` section holding the Sign Out
  `Pressable`, plus the `rootNavigation` const and the `NativeStackNavigationProp` /
  `RootStackParamList` imports it is the only consumer of.
- `src/i18n/locales/en.ts`, `es.ts`, `fr.ts`, `de.ts` — two keys each.

Not affected: `db/`, `services/`, `store/`, `utils/`. Backup export
(`createBackupArchive`, `shareBackupArchive`), restore (`pickBackupFile`,
`loadBackupArchive`, `applyBackup`), reminder scheduling, and expiry calculation are all
untouched. No SQLite schema or migration change; no AsyncStorage key change.

Dependencies: none added or removed.

Risk: Low. The main implementation trap is leaving `rootNavigation` and its import behind
in `AppDrawerContent`, which `npm run typecheck` / lint will flag.
