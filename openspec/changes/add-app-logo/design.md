## Context

See `proposal.md — Why` for motivation and `specs/app-branding/spec.md` for the behaviour
contract.

The constraints that shape the approach:

- The user supplies the mark. This change owns derivation, framing and wiring only — it
  makes no design decisions about the artwork itself beyond the simplifications each target
  format forces.
- Current assets and their state: `icon.png` 1024² RGB opaque, `android-icon-foreground.png`
  512² RGBA, `android-icon-background.png` 512² RGBA opaque, `android-icon-monochrome.png`
  432² RGBA, `splash-icon.png` 1024² palette-mode opaque, `favicon.png` 48² RGBA. Three of
  the six are below the resolution their target wants, so every file is re-exported at full
  size rather than resized in place.
- `app.json` already points at all six paths. Only `android.adaptiveIcon.backgroundColor`
  (`#E6F4FE`, picked for the placeholder chevron) is wrong once the mark changes.
- **No SVG rasteriser is installed** — no sharp, ImageMagick, Inkscape, rsvg or cairosvg.
  Python 3 with Pillow 11.3 is available. `jimp-compact` exists only as a transitive Expo
  dependency and is not something to build on.
- Android's adaptive icon is a 108×108dp canvas of which only a **66dp-diameter centred
  circle** is guaranteed visible; everything outside it may be clipped by the launcher's
  mask or cropped during parallax. On a 1024px layer that circle is 1024 × 66/108 ≈ **626px
  across**.
- iOS renders transparency in an app icon as black, so `icon.png` must be flattened.

## Goals / Non-Goals

**Goals:**

- Derive all six assets from one master so they cannot drift apart.
- Make the safe-zone and opacity rules explicit and checkable, since these are the failures
  that only show up on a real device after a full rebuild.
- Leave regeneration possible a year from now without reconstructing this reasoning.

**Non-Goals:**

- No design work on the mark, no wordmark, no lockup, no alternate marks.
- No in-app use of the logo beyond the splash artwork the pending `add-splash-screen` work
  already renders.
- No iOS-specific icon variants beyond `icon.png`, and no notification icon — Android's
  notification icon is a separate silhouette asset the app does not configure today, and
  adding one is out of scope.

## Decisions

### Ask for the master as vector or layered art, not a flat PNG

The monochrome themed-icon layer is the constraint that decides this. If the mark is a
shield with a **white check on top**, its alpha channel is a solid shield — flattening it to
one colour produces a featureless blob and the check vanishes entirely. A legible themed
icon needs the check as **negative space**: a hole knocked out of the shield's alpha.

That cannot be derived reliably from a flat RGBA export; it needs either a vector source
whose paths can be recombined, a layered file, or a separately supplied monochrome variant.

Preference order for the supplied master:

1. Vector (SVG/AI/Figma export) — everything else derives from it cleanly.
2. Layered raster (PSD/XCF) at ≥1024².
3. Flat transparent PNG at ≥1024² **plus** a supplied monochrome variant.
4. Flat transparent PNG alone — workable, but the monochrome layer has to be hand-authored
   by knocking the check out, and is the one asset that may not match the mark exactly.

If a vector master arrives, one manual export to a ≥1024px transparent PNG is needed from
the design tool first, because nothing on this machine can rasterise it. That is a
one-command step in any design tool and is not worth adding a toolchain dependency for.

### Derive with a committed Python/Pillow script, not by hand and not with a new npm dependency

All six assets come from one script, `scripts/generate-app-icons.py`, run against the
master. Deriving by hand invites the safe-zone and opacity mistakes this design exists to
prevent, and doing it once by hand leaves nothing behind for the next time.

*Alternative considered:* a Node script using `sharp`. Rejected — it would add a
native-binary devDependency to an Expo project, installed on every CI run, for a task that
happens perhaps once a year. Pillow is already present, and the script is a development
tool that has no part in the app build.

*Alternative considered:* a prose recipe in the README with no script. Rejected — the safe
zone is arithmetic (626px on a 1024px canvas), and arithmetic in prose gets rounded wrong.

The script's Python requirement is documented as needed **only** for regenerating icons,
never for building or running the app, so it cannot become a hidden prerequisite.

### Derivation rules, one per target

| Asset | Size | Alpha | Framing |
|---|---|---|---|
| `icon.png` | 1024² | flattened, fully opaque | mark on brand background, edge to edge, no rounding or shadow |
| `android-icon-foreground.png` | 1024² | transparent | mark fits inside the centred 626px safe circle |
| `android-icon-background.png` | 1024² | opaque | flat brand background colour, nothing else |
| `android-icon-monochrome.png` | 1024² | silhouette in alpha | same 626px safe circle; check as negative space |
| `splash-icon.png` | 1024² | transparent | mark alone, filling most of the canvas |
| `favicon.png` | 196² | transparent | simplified mark, checked at 16px |

The two Android layers move from 512²/432² to 1024², matching the launcher icon's source
resolution; there is no reason to keep feeding Android a smaller source than iOS gets.

`favicon.png` grows from 48² to 196² so it stays sharp on high-density displays and as a
bookmark tile. Nothing in `app.json` needs to change for that — `web.favicon` is a path, not
a size.

### Take the brand background colour from the master, and set it in exactly two places

The adaptive icon's background exists twice: as `android-icon-background.png` and as
`android.adaptiveIcon.backgroundColor` in `app.json`. The spec requires them to agree, so
the script emits the background layer from the same colour value that gets written into
`app.json`, and the value is sampled from the supplied master rather than eyeballed.

*Note on scope:* `#E6F4FE` today is a pale blue matched to the placeholder chevron. If the
supplied mark is the indigo shield from `docs/design/app-design.png`, this becomes an
indigo-family colour. Picking it is a one-line change, but it is a visible brand decision,
so the chosen value is called out for review rather than applied silently.

### Verify on a device, not in the file browser

Safe-zone clipping, themed-icon legibility and iOS's black-transparency behaviour are all
invisible in a file preview and only appear after a native rebuild. Verification is
therefore a device pass — circular and squircle mask, themed icons on, light and dark
splash — not an inspection of the PNGs.

Automated checks cover only what is mechanically checkable: dimensions, opacity of
`icon.png`, transparency of the splash and foreground layers, and that the mark's bounding
box fits inside the 626px circle.

## Risks / Trade-offs

- **The monochrome layer is the one that will look wrong.** → Requested explicitly as part
  of the supplied design (preference order above); if it has to be hand-authored, it gets
  its own device check with themed icons enabled rather than being signed off from a
  thumbnail.
- **Safe-zone violations only surface on certain launchers.** → The script enforces the
  626px bound at generation time rather than trusting visual judgement, and the device pass
  covers both circular and squircle masks.
- **`icon.png` with any residual alpha renders black regions on iOS.** → Flattened onto the
  brand background explicitly in the script, and asserted opaque as a check.
- **A native rebuild is required; an installed app or stale dev client keeps the old icon.**
  → Called out in the task list so a "the icon didn't change" result is diagnosed as a stale
  build rather than a bad asset.
- **`splash-icon.png` is shared with `add-splash-screen` (issues #77–#79).** → That change's
  spec already requires the artwork to be replaceable without code changes, so the two are
  independent and can land in either order; whichever is second inherits the other's result.
- **Python/Pillow is a new tool in a Node repo.** → Confined to a development script,
  documented as unnecessary for building or running the app, and touching nothing the app
  bundles.

## Migration Plan

No data migration — no schema, AsyncStorage key, or persisted shape changes.

Deployment is a normal native rebuild. Rollback is `git revert` of the asset commit plus the
`app.json` colour; the assets are ordinary files with no persisted state behind them.

## Open Questions

- The exact brand background colour for the adaptive icon depends on the supplied artwork;
  it is sampled from the master and surfaced for review during implementation. This does not
  change the specs, the approach, or the task breakdown.
