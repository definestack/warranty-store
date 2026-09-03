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
4. Writes the new value back to `version-code.txt` and syncs it into `app.json`.
