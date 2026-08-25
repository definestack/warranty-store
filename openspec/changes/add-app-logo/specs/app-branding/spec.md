## Purpose

Defines the app's visual identity as the operating system and the browser present it — the
launcher icon, the Android adaptive and themed icon layers, the splash artwork and the web
favicon — including which must be opaque, which must be transparent, the safe zone that
keeps the mark from being clipped by a launcher mask, and the requirement that all of them
show one consistent mark. This capability covers presentation of the logo, not the design
of the mark itself.

## ADDED Requirements

### Requirement: Every app-identity surface SHALL show the product's own mark

The launcher icon, the Android adaptive icon, the Android themed icon, the splash artwork
and the web favicon SHALL all present the product's own logo. None of them SHALL show
generic, stock or framework-default artwork.

All of these surfaces SHALL show the same recognisable mark, so that the icon the user taps
in the launcher, the artwork shown while the app starts, and the icon shown in a browser tab
are visibly the same product.

#### Scenario: The launcher icon is the product's own

- **WHEN** the user views the installed app in the device launcher
- **THEN** the icon shown is the product's logo
- **AND** it is not the framework's default placeholder artwork

#### Scenario: Launch and launcher agree

- **WHEN** the user taps the app icon and the splash appears
- **THEN** the mark on the splash is recognisably the same mark as the launcher icon

### Requirement: The launcher icon SHALL be fully opaque and edge to edge

The launcher icon SHALL be square, SHALL be at least 1024×1024, and SHALL be fully opaque —
it SHALL carry no transparency, because platforms that composite an icon over their own
background render transparent regions as black.

The icon SHALL fill its square edge to edge and SHALL NOT include its own rounded corners,
drop shadow, or padding that imitates a platform icon shape. The platform applies its own
mask and shadow.

#### Scenario: The icon has no transparency

- **WHEN** the launcher icon asset is inspected
- **THEN** every pixel is fully opaque

#### Scenario: The icon carries no pre-applied platform shape

- **WHEN** the launcher icon asset is inspected
- **THEN** it has square corners with no built-in rounding or shadow
- **AND** the artwork extends to all four edges rather than sitting inside padding

### Requirement: The adaptive icon SHALL keep the mark inside the safe zone

The Android adaptive icon SHALL be supplied as two square layers of the same size, a
transparent foreground and an opaque background.

The mark SHALL be confined to the adaptive icon's central safe zone, so that no part of it
is clipped by any mask the launcher applies — circle, squircle, rounded square, or teardrop
— and so that it is not cropped when the launcher animates the layers in parallax.

The background layer SHALL be a solid colour or an evenly distributed pattern with no
detail near its edges that would be lost to cropping. The configured adaptive-icon
background colour SHALL match the background layer's colour, so the two cannot disagree.

#### Scenario: The mark survives a circular mask

- **WHEN** the launcher applies a circular mask to the adaptive icon
- **THEN** the whole mark is visible with none of it clipped

#### Scenario: The mark survives a squircle mask

- **WHEN** the launcher applies a squircle or rounded-square mask to the adaptive icon
- **THEN** the whole mark is visible with none of it clipped

#### Scenario: The background layer has no croppable detail

- **WHEN** the adaptive icon's background layer is inspected
- **THEN** it is a solid colour or an even pattern
- **AND** it carries no detail near its edges that a mask would cut off

#### Scenario: The configured background colour matches the layer

- **WHEN** the adaptive icon's configured background colour is compared with the background
  layer asset
- **THEN** they are the same colour

### Requirement: The themed icon SHALL be a single-colour silhouette

The Android themed icon layer SHALL be a silhouette of the mark defined entirely by its
alpha channel, so the system can recolour it to match the user's wallpaper-derived theme.
It SHALL NOT rely on its own colours to be legible.

The silhouette SHALL respect the same safe zone as the adaptive foreground, and SHALL stay
recognisable as the mark when filled with a single flat colour — details that only read
through colour contrast, gradients, or multiple tones SHALL be simplified or omitted.

#### Scenario: The themed icon is recoloured by the system

- **WHEN** the user enables themed icons and the system recolours the icon to the wallpaper
  theme
- **THEN** the mark is still recognisable as a single flat shape

#### Scenario: The silhouette carries no colour dependence

- **WHEN** the themed icon layer is inspected
- **THEN** its shape is carried by the alpha channel
- **AND** flattening it to one colour loses no part of the mark's identity

#### Scenario: The themed icon respects the safe zone

- **WHEN** the launcher masks the themed icon
- **THEN** the whole silhouette is visible with none of it clipped

### Requirement: The splash artwork SHALL be transparent and legible at its rendered size

The splash artwork SHALL be the mark alone on a transparent background, with no baked-in
background colour, because the splash background is supplied separately and follows the
system theme.

It SHALL be legible against both the light and the dark splash background — a mark that
disappears into either is not acceptable — and SHALL remain sharp at the width the splash
actually renders it at, on the highest-density supported screen.

#### Scenario: The artwork carries no background

- **WHEN** the splash artwork asset is inspected
- **THEN** the area around the mark is fully transparent

#### Scenario: The mark reads on both splash backgrounds

- **WHEN** the app is launched in light appearance and again in dark appearance
- **THEN** the mark is clearly legible against the background in both cases

#### Scenario: The artwork is sharp at its rendered size

- **WHEN** the splash is shown on a high-density screen
- **THEN** the mark is sharp, with no visible softness or pixellation from upscaling

### Requirement: The favicon SHALL remain legible at small sizes

The web favicon SHALL show the mark, simplified as far as needed to stay legible in a
browser tab. Fine internal detail that becomes an indistinct smudge at that size SHALL be
dropped in favour of the mark's recognisable silhouette.

#### Scenario: The favicon is legible in a browser tab

- **WHEN** the web build is opened in a browser
- **THEN** the tab icon is recognisable as the app's mark rather than an indistinct shape

### Requirement: An editable master of the logo SHALL be kept in the repository

The repository SHALL retain the highest-fidelity source of the logo it has been given,
alongside the derived assets, so that future sizes are produced from the original rather
than by upscaling an exported PNG.

Every derived asset SHALL be traceable to that master — regenerating them from it SHALL
produce the same set of surfaces described above.

#### Scenario: A new size is needed later

- **WHEN** a new asset size or platform target is required later
- **THEN** it can be produced from the retained master
- **AND** no derived asset has to be upscaled to produce it
