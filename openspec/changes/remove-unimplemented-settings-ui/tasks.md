## 1. Settings screen

- [ ] 1.1 Remove the "Backup & Restore" `SettingsRow` from the General section of
      `src/screens/SettingsScreen.tsx`, along with the now-orphaned divider so the section
      does not open with a stray separator above "Export Data".
- [ ] 1.2 Remove the "Sign Out" `Pressable` and its `Text` child from the end of the
      `ScrollView` in `src/screens/SettingsScreen.tsx`.
- [ ] 1.3 Remove the `signOut` and `signOutText` rules from the screen's `StyleSheet`.
- [ ] 1.4 Confirm no import in the file became unused (`t` and every remaining import are
      still referenced).

## 2. Navigation drawer

- [ ] 2.1 Remove the final drawer section holding the Sign Out `Pressable` from
      `src/navigation/AppDrawerContent.tsx`, together with the divider that separates it
      from the Help & Feedback section.
- [ ] 2.2 Remove the `rootNavigation` const — the Sign Out handler was its only consumer.
- [ ] 2.3 Remove the now-unused `NativeStackNavigationProp` and `RootStackParamList`
      imports left behind by 2.2.
- [ ] 2.4 Verify the drawer still renders the Help & Feedback section correctly with the
      trailing divider gone.

## 3. Localization

- [ ] 3.1 Remove `settings.backupRestore` and `settings.signOut` from
      `src/i18n/locales/en.ts`.
- [ ] 3.2 Remove the same two keys from `es.ts`, `fr.ts`, and `de.ts`.
- [ ] 3.3 Remove `nav.signOut` from all four locale files.
- [ ] 3.4 Grep for `backupRestore` and `signOut` across `src/` to confirm no reference
      survives in either direction (no key without a caller, no caller without a key).

## 4. Verification

- [ ] 4.1 Run `npm run typecheck` — this is what catches a leftover `rootNavigation` or a
      stale locale-type mismatch.
- [ ] 4.2 Run `npm run lint`.
- [ ] 4.3 Run `npm test` and confirm the existing suites still pass (220 tests at
      baseline). No test changes are expected — no `db/`, `services/`, `store/`, or
      `utils/` code is touched, and no screen tests exist.
- [ ] 4.4 Launch the app and confirm on-device: Settings General section starts at "Export
      Data", no Sign Out button at the bottom of Settings, and no Sign Out item in the
      drawer.
- [ ] 4.5 Confirm export and import still work end to end — they share the section that
      was edited and must not have been disturbed.
- [ ] 4.6 Switch the app language to each of es, fr, and de and confirm Settings and the
      drawer render with no missing-translation placeholders.
