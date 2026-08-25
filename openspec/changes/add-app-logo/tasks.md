## 1. Receive and validate the supplied design

- [ ] 1.1 Obtain the logo master from the user. Preferred order: vector (SVG/AI/Figma
      export), layered raster at ≥1024², flat transparent PNG at ≥1024² plus a monochrome
      variant, or flat transparent PNG alone.
      GitHub: #80
- [ ] 1.2 If the master is vector, export it once to a ≥1024×1024 transparent PNG from the
      design tool — nothing installed on this machine can rasterise SVG.
      GitHub: #80
- [ ] 1.3 Confirm the master is square, at least 1024×1024, and has a genuinely transparent
      background (not white pixels standing in for transparency).
      GitHub: #80
- [ ] 1.4 Confirm a monochrome treatment is available or decide it must be hand-authored:
      check whether the mark's interior detail reads as negative space when the artwork is
      flattened to a single colour. If not, agree the simplification with the user before
      generating anything.
      GitHub: #80
- [ ] 1.5 Sample the brand background colour from the master and confirm the chosen value
      with the user — it becomes both `android-icon-background.png` and
      `android.adaptiveIcon.backgroundColor`.
      GitHub: #80
- [ ] 1.6 Commit the master to the repository alongside the derived assets so future sizes
      come from the original rather than an upscaled export.
      GitHub: #80

## 2. Generation script

- [ ] 2.1 Create `scripts/generate-app-icons.py` (Python 3 + Pillow) taking the master and
      the brand colour as inputs and emitting all six assets into `assets/`.
      GitHub: #80
- [ ] 2.2 Implement `icon.png` — 1024×1024, mark composited onto the brand background,
      flattened to fully opaque with no alpha channel, edge to edge with no rounding, shadow
      or padding.
      GitHub: #80
- [ ] 2.3 Implement `android-icon-foreground.png` — 1024×1024 transparent, mark scaled and
      centred so its bounding box fits inside the centred 626px safe circle
      (1024 × 66/108). Fail the run rather than emit a file that overflows it.
      GitHub: #80
- [ ] 2.4 Implement `android-icon-background.png` — 1024×1024 opaque, flat brand colour,
      nothing else.
      GitHub: #80
- [ ] 2.5 Implement `android-icon-monochrome.png` — 1024×1024, silhouette carried entirely
      by the alpha channel, same 626px safe circle, interior detail as negative space.
      GitHub: #80
- [ ] 2.6 Implement `splash-icon.png` — 1024×1024 transparent, mark alone with no background,
      filling most of the canvas so it stays sharp at the 200dp width the splash renders it
      at on an xxxhdpi screen.
      GitHub: #80
- [ ] 2.7 Implement `favicon.png` — 196×196 transparent, simplified as needed for small-size
      legibility.
      GitHub: #80
- [ ] 2.8 Add the mechanical assertions to the script: exact dimensions per file,
      `icon.png` fully opaque, foreground/monochrome/splash have transparent margins, and
      the foreground and monochrome bounding boxes fit the safe circle.
      GitHub: #80

## 3. Generate and wire up

- [ ] 3.1 Run the script and replace all six files in `assets/`.
      GitHub: #80
- [ ] 3.2 Update `android.adaptiveIcon.backgroundColor` in `app.json` from `#E6F4FE` to the
      confirmed brand colour. Leave the `icon`, `adaptiveIcon.*Image` and `web.favicon`
      paths untouched — the files are swapped in place.
      GitHub: #80
- [ ] 3.3 Confirm no file under `src/` changed.
      GitHub: #80

## 4. Verification

- [ ] 4.1 Run `npm run typecheck`, `npm run lint` and `npm test` — all must pass unaffected.
      GitHub: #80
- [ ] 4.2 Run `npx expo-doctor` and `npx expo export --platform android` and confirm both
      succeed with the new assets.
      GitHub: #80
- [ ] 4.3 Rebuild natively with `npm run android`. An installed app or stale dev client keeps
      showing the old icon — if the icon appears unchanged, confirm it is a stale build
      before suspecting the asset.
      GitHub: #80
- [ ] 4.4 On device, verify the launcher icon under a **circular** mask: the whole mark is
      visible with nothing clipped.
      GitHub: #80
- [ ] 4.5 On device, verify the launcher icon under a **squircle / rounded-square** mask, and
      while the launcher animates the adaptive layers: nothing clipped or cropped.
      GitHub: #80
- [ ] 4.6 Enable themed icons (Android 13+) and confirm the monochrome layer is recoloured to
      the wallpaper theme and is still recognisable as the mark as one flat shape.
      GitHub: #80
- [ ] 4.7 Cold start in light appearance and again in dark appearance; confirm the splash
      mark is legible against both backgrounds and is sharp with no upscaling softness.
      GitHub: #80
- [ ] 4.8 Open the web build and confirm the browser-tab favicon is recognisable as the mark
      rather than an indistinct shape; check it at 16px.
      GitHub: #80
- [ ] 4.9 Confirm the launcher icon, splash artwork and favicon all read as the same mark.
      GitHub: #80

## 5. Documentation

- [ ] 5.1 Document in `README.md` where the logo master lives, that `scripts/generate-app-icons.py`
      regenerates all six assets from it, and that Python 3 with Pillow is required **only**
      for regenerating icons — never for building or running the app.
      GitHub: #80
- [ ] 5.2 Note in the same section that changing app icons requires a native rebuild to be
      visible on a device.
      GitHub: #80
