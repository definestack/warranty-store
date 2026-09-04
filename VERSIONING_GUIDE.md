# Version Code Automation Guide

## Quick Start

Before building a release, run:

```bash
npm run version:bump
```

This automatically:
- Calculates today's version code using YYDOYBOD format
- Ensures strict monotonic increase from the last build
- Updates `version-code.txt` and `android/app/build.gradle`
- Increments the build counter if you release multiple times in one day

## What Changed

The version code automation is now fully implemented:

| File | What It Does |
|------|-------------|
| `scripts/update-version.js` | The version bumping script |
| `scripts/update-version.test.js` | Unit tests for the calculation logic |
| `npm run version:bump` | CLI command to run the script |
| `docs/versioning.md` | Complete technical documentation |

## Before Your First Release Build

### Step 1: Run the version bump script
```bash
npm run version:bump
```

Expected output:
```
✓ Version code bumped to 262610002
  Date: 2026-09-04
  Build of day: 2
  Version name: 0.5.2.262610002
✓ Updated: D:\Source\warranty-store\version-code.txt
✓ Updated: D:\Source\warranty-store\android\app\build.gradle
```

### Step 2: Build and release
```bash
npm run android    # or build for Play Store
```

The APK/AAB will include the new version code from step 1.

## Multiple Builds Same Day

If you need to release multiple times on the same calendar day:

```bash
# First build
npm run version:bump   # BOD becomes 0001
npm run android

# Later that day, if needed...
npm run version:bump   # BOD becomes 0002 (auto-incremented)
npm run android
```

## The YYDOYBOD Format

```
262610001
│││││││└─ Build of day (0001-9999)
│││└─────── Day of year (001-366)
└──────────── Two-digit year (26 = 2026)
```

- **Strictly increasing**: Each build must have a higher code than the last
- **Date-based**: Resets daily unless building multiple times
- **Atomic**: Updated once per release build

## Verification

To verify the version code calculation logic:

```bash
npm test -- scripts/update-version.test.js
```

All 6 tests should pass, validating day-of-year, monotonic increase, and parsing.

## Troubleshooting

**"Invalid versionCode in version-code.txt"**
- `version-code.txt` has non-numeric content or is empty
- Fix: Restore it from git or set to a valid 9-digit code

**Version code went backward**
- This shouldn't happen — the script prevents it
- If it does, reset `version-code.txt` to a known good value

**Build still shows old version**
- Clear build cache: `npm run android -- --clear-cache`
- Verify `android/app/build.gradle` has the new `versionCode` and `versionName`

## Files Affected

- `version-code.txt` — always updated (commit this after release)
- `android/app/build.gradle` — always updated (may be generated)
- `app.json` — NOT updated (kept as is)

Remember: **Commit `version-code.txt` after every release build** to ensure the next developer gets the correct baseline.
