# Android Version Code Tracking

## Format: YYDOYBOD

The Android `versionCode` is generated using a `YYDOYBOD` format, encoded as a single
strictly-increasing integer:

| Segment | Length | Meaning                                   |
| ------- | ------ | ------------------------------------------ |
| `YY`    | 2      | Two-digit year (e.g. `26` for 2026)        |
| `DOY`   | 3      | Day of year, zero-padded (`001`-`366`)     |
| `BOD`   | 4      | Build number of the day, zero-padded, starting at `0001` |

Example: `262610001`

* `26` → year 2026
* `261` → the 261st day of 2026
* `0001` → the 1st build produced that day

If more than one build is released on the same calendar day, `BOD` increments
(`0002`, `0003`, ...). The next day resets `BOD` back to `0001` and `DOY` advances.

## `version-code.txt`

The repo root `version-code.txt` file holds the last-used `versionCode` as a plain
integer (no comments, no whitespace besides a trailing newline) so it can be read and
written programmatically.

This file is intentionally committed to git — each release atomically increments the
value and commits it, guaranteeing `versionCode` always strictly increases across
builds, matching the Play Store requirement that every uploaded APK/AAB have a higher
`versionCode` than the last.

It is updated by `scripts/update-version.js` (see `npm run version:bump`), which:

1. Reads the current date and the last value in `version-code.txt`.
2. Computes the `YYDOYBOD` value for today.
3. If today's computed value is not greater than the stored value (e.g. a second build
   on the same day), increments the `BOD` segment instead.
4. Writes the new value back to `version-code.txt`, updates `android/app/build.gradle`
   with the new `versionCode` and `versionName` (skipped with a warning if `android/`
   hasn't been generated yet), and updates `app.json`'s `expo.android.versionCode`.

### Why `app.json` matters

`expo-constants` embeds `expo.android.versionCode` from `app.json` into the app at
build time, and `src/utils/appVersion.ts` reads it at runtime to show the build number
in the Settings screen. It's also the value `expo prebuild` uses to (re)generate
`android/app/build.gradle`. If `app.json` isn't kept in sync, the in-app display goes
stale even though the native build number keeps incrementing — so the bump script
treats `app.json` as one of the files it must update on every run, not just
`version-code.txt` and `build.gradle`.

## Usage

Before a release build, run:

```bash
npm run version:bump
```

This will:
- Calculate today's version code using YYDOYBOD format
- Ensure strict monotonic increase (never goes backward)
- Increment `BOD` for multiple builds on the same day
- Update `version-code.txt` with the new code
- Update `android/app/build.gradle` to match (if `android/` exists)
- Update `app.json`'s `expo.android.versionCode` to match

Example workflow:

```bash
# Before first build of the day
npm run version:bump

# Creates new build with auto-incremented version code
npm run android
```

For multiple builds on the same day, run `npm run version:bump` before each one — it will increment `BOD` automatically.

## Testing

The version code calculation is tested in `scripts/update-version.test.js`:

```bash
npm test -- scripts/update-version.test.js
```
