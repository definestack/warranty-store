## 1. Dependency and native configuration

- [ ] 1.1 Install the SDK-matched splash package with `npx expo install expo-splash-screen`
      and confirm `package.json` records it in `dependencies` (not `devDependencies`).
      GitHub: #77
- [ ] 1.2 Add the `expo-splash-screen` plugin entry to `app.json` `expo.plugins` with
      `image: "./assets/splash-icon.png"`, `imageWidth: 200`, `resizeMode: "contain"`,
      `backgroundColor: "#FFFBFE"`, and a `dark` variant using the same image with
      `backgroundColor: "#1C1B1F"`.
      GitHub: #77
- [ ] 1.3 Add a comment in `src/theme/palette.ts` noting that the two splash background
      literals in `app.json` must stay equal to the MD3 light/dark `background` values.
      GitHub: #77
- [ ] 1.4 Run `npx expo-doctor` and confirm it passes with the new plugin entry.
      GitHub: #77

## 2. Bootstrap store (TDD — tests first)

- [ ] 2.1 Write failing tests in `src/store/bootstrapStore.test.ts` covering: initial status
      is `loading`; a successful `initialize()` moves status to `ready` with `error: null`;
      a failing `initDatabase()` moves status to `error` and records the message.
      GitHub: #78
- [ ] 2.2 Extend those tests to cover retry: `retry()` after a failure resets status to
      `loading` then to `ready` when initialization succeeds; a second failure returns to
      `error` and leaves retry available; a non-`Error` rejection is stringified rather than
      dropped.
      GitHub: #79
- [ ] 2.3 Add a test asserting `initialize()` is a no-op while an attempt is already in
      flight — two concurrent calls result in exactly one `initDatabase()` call.
      GitHub: #78
- [ ] 2.4 Implement `src/store/bootstrapStore.ts` (zustand `create`, `status`, `error`,
      `initialize`, `retry`) as the minimum needed to make 2.1–2.3 pass, and keep the
      existing `console.error` logging on failure.
      GitHub: #78
- [ ] 2.5 Run `npm test` and confirm the new suite passes with no regressions in the
      existing 18 suites.
      GitHub: #78

## 3. Branded splash component

- [ ] 3.1 Create `src/components/AppSplash.tsx`: the logo from
      `require('../../assets/splash-icon.png')` centred on `theme.background` at 200px wide
      with `resizeMode="contain"`, plus optional `children` rendered below it. Add a comment
      tying the 200px width to `imageWidth` in `app.json`.
      GitHub: #78
- [ ] 3.2 Have `AppSplash` render the `StatusBar` with the same light/dark logic the current
      loading branch uses, so the status bar does not flip during the handoff.
      GitHub: #78
- [ ] 3.3 Add a `common.retry` key to `src/i18n/locales/en.ts`, `es.ts`, `fr.ts` and `de.ts`;
      leave `common.initializingDatabase` and `common.databaseError` unchanged.
      GitHub: #79

## 4. Wire the app entry

- [ ] 4.1 In `src/App.tsx`, call `SplashScreen.preventAutoHideAsync()` once at module scope
      and swallow its rejection so it cannot surface as an unhandled rejection.
      GitHub: #78
- [ ] 4.2 Replace the local `useState` boot state in `App` with `useBootstrapStore`, calling
      `initialize()` from an effect on mount. Leave the notification-response listener and
      the notifications-preference effect untouched.
      GitHub: #78
- [ ] 4.3 Rewrite the `loading` branch of `AppShell` to render `AppSplash` with the existing
      `common.initializingDatabase` text.
      GitHub: #78
- [ ] 4.4 Rewrite the `error` branch to render `AppSplash` with the existing
      `common.databaseError` message plus a Paper `Button` calling `retry()`, labelled with
      `common.retry`.
      GitHub: #79
- [ ] 4.5 Call `SplashScreen.hideAsync()` from the root view's `onLayout` once status is no
      longer `loading`, so it fires on both `ready` and `error` and only after the first real
      frame is committed. Guard against calling it more than once.
      GitHub: #78
- [ ] 4.6 Confirm the provider order (`GestureHandlerRootView > LocaleProvider >
      ThemeProvider > SafeAreaProvider > PaperProvider > NavigationContainer`) is unchanged
      and that `AppSplash` still renders inside `ThemeProvider` and `LocaleProvider`.
      GitHub: #78

## 5. Verification

- [ ] 5.1 Run `npm run typecheck`, `npm run lint` and `npm test` — all must pass.
      GitHub: #78
- [ ] 5.2 Run `npx expo export --platform android` and confirm it succeeds with the plugin
      and the referenced asset.
      GitHub: #77
- [ ] 5.3 Rebuild natively with `npm run android` (an existing dev client will not pick up
      the plugin) and verify on a cold start: splash appears immediately, no unbranded frame
      before it, and no blank frame between splash and Home.
      GitHub: #78
- [ ] 5.4 Verify the dark variant — set the device to dark appearance, cold start, and
      confirm the splash uses `#1C1B1F` with no light flash; repeat in light appearance and
      confirm no dark flash.
      GitHub: #77
- [ ] 5.5 Verify the notification path — cold start the app by tapping a warranty reminder
      and confirm the splash shows and the app still routes to that item's detail screen.
      GitHub: #78
- [ ] 5.6 Temporarily force `initDatabase()` to reject, confirm the splash hides rather than
      hanging, the branded error state appears with the error detail, retry re-runs
      initialization, and a successful retry continues to Home. Revert the forced failure.
      GitHub: #79
- [ ] 5.7 Switch the app language to a non-English locale and confirm the preparing message
      and the retry label are translated.
      GitHub: #79

## 6. Documentation

- [ ] 6.1 Note in `README.md` that the splash artwork is `assets/splash-icon.png` and that
      replacing that one file updates the native splash and both in-app launch states, and
      that a native rebuild is required after changing splash configuration.
      GitHub: #79
