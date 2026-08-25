## Why

Every image in `assets/` is still Expo's default placeholder art. `icon.png` and
`android-icon-foreground.png` are the stock blue chevron, `splash-icon.png` is the
grid-and-concentric-circles graphic, and `android-icon-monochrome.png` and `favicon.png`
are the same stock shapes. The app therefore ships with no identity of its own: the
launcher icon, the Android 13+ themed icon, the splash and the web favicon all advertise a
generic Expo project rather than Warranty Store.

A logo exists in intent — `docs/design/app-design.png` shows an indigo shield with a check
— but it has never been exported to `assets/`, and at roughly 45px inside that mockup it is
not usable as a source. The pending splash work (`add-splash-screen`) is built to display
whatever `splash-icon.png` contains, so it will faithfully ship the placeholder until this
lands.

## What Changes

- The user supplies the logo design; this change derives **all six** production assets from
  it at the correct size, framing and transparency for each target, and wires them up.
- **`icon.png`** — the launcher/store icon. 1024×1024, fully opaque (no alpha), mark on its
  own background, edge-to-edge with no built-in rounding.
- **`android-icon-foreground.png`** — the adaptive icon's foreground layer. 1024×1024
  transparent, with the mark confined to the adaptive-icon **safe zone** so it is not
  clipped by whatever mask the launcher applies (circle, squircle, rounded square).
- **`android-icon-background.png`** — the adaptive icon's background layer. 1024×1024
  opaque, a solid brand colour, no detail that could be cropped.
- **`android-icon-monochrome.png`** — the Android 13+ themed-icon layer. A single-colour
  silhouette of the mark carried entirely by its alpha channel, on the same safe zone as
  the foreground.
- **`splash-icon.png`** — the splash artwork. 1024×1024 transparent, the mark alone with no
  background, sized to read correctly at the 200px width the splash renders it at.
- **`favicon.png`** — the web favicon, legible at 16px.
- **`app.json`** — `android.adaptiveIcon.backgroundColor` is currently `#E6F4FE`, a pale
  blue chosen for the placeholder chevron. It changes to the new brand background so the
  adaptive icon's colour matches the artwork.
- A **master source file** for the logo is committed alongside the derived PNGs, so future
  resizing works from the original rather than from an upscaled export.

Not in scope: designing the mark (the user provides it), a wordmark or lockup, in-app logo
usage beyond the splash, iOS-specific icon variants beyond `icon.png`, and any change to
`src/`.

**Assumptions to flag**, both recorded because they change the task list rather than the
outcome:

1. The supplied design is expected as a **square PNG of at least 1024×1024 with a
   transparent background**, or as a vector file. No SVG rasteriser is installed on this
   machine (no sharp, ImageMagick, Inkscape or cairosvg), so a vector source needs one
   manual export to a ≥1024px PNG from the design tool before derivation can start.
2. The mark is assumed to be the shield-and-check from `docs/design/app-design.png`, or a
   direct evolution of it. If the supplied design differs substantially the derivation work
   is unchanged — only the brand colours in `app.json` and the background layer would need
   re-picking.

## Capabilities

### New Capabilities
- `app-branding`: the app's visual identity as the operating system and the browser present
  it — the launcher icon, the adaptive and themed icon layers, the splash artwork and the
  web favicon — including how each is framed, which must be opaque, which must be
  transparent, and the safe zone that keeps the mark from being clipped.

### Modified Capabilities
<!-- None. `settings` is unaffected. `app-launch` (pending in add-splash-screen) already
     requires the splash artwork to be replaceable without code changes; replacing
     splash-icon.png exercises that requirement rather than changing it. -->

## Impact

- **Assets**: all six files in `assets/` replaced. Current state for reference —
  `icon.png` 1024² RGB opaque, `android-icon-foreground.png` 512² RGBA,
  `android-icon-background.png` 512² RGBA opaque, `android-icon-monochrome.png` 432² RGBA,
  `splash-icon.png` 1024² palette-mode opaque, `favicon.png` 48² RGBA. Several are below
  the recommended source resolution and are re-exported at full size.
- **Config**: `app.json` — `android.adaptiveIcon.backgroundColor` only. The `icon`,
  `adaptiveIcon.*Image` and `web.favicon` paths are unchanged, so the files are swapped in
  place with no config churn.
- **Code**: none. No file under `src/` changes.
- **Dependencies**: none added.
- **Data / schema / business logic**: none.
- **Build**: a native rebuild is required for the launcher and adaptive icons to update —
  an installed app or stale dev client keeps showing the old icon. CI's `expo-doctor` and
  `expo export --platform android` must still pass with the new files.
- **Coordination**: `splash-icon.png` is also the asset `add-splash-screen` (issues #77–#79)
  wires up. The two changes touch that one file and can land in either order; whichever is
  second simply sees the other's result.
