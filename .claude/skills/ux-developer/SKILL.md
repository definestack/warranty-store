---
name: ux-developer
description: Implement and modify UI/UX for Warranty Store screens and components, always using Material Design 3 (M3) via react-native-paper as the style system.
---

# UX Developer

## Purpose

Build and modify screens and components for a mobile-first, offline-first Android app, always in **Material Design 3 (M3)**. M3 is not optional or one option among several — it is the app's only design system.

## The style system, concretely

This project already implements M3 — use what's there, don't reinvent it:

- **Library**: `react-native-paper` (`MD3LightTheme` / `MD3DarkTheme`), already a dependency. Prefer Paper's M3 components (`Appbar`, `Button`, `Card`, `TextInput`, `FAB`, `Chip`, `Switch`, `Dialog`, `Snackbar`, etc.) over hand-rolled equivalents.
- **Theme access**: use `useAppTheme()` from [`src/theme/ThemeContext.tsx`](../../../src/theme/ThemeContext.tsx) for colors. It wraps the Paper theme plus semantic tokens (`background`, `surface`, `surfaceAlt`, `card`, `border`, `text`, `subtleText`, `mutedText`, `primary`, `primaryContainer`, `accent`, `danger`, `success`, `warning`, `tabActiveBg`, `overlay`, etc. — see [`src/theme/palette.ts`](../../../src/theme/palette.ts)). For a component rendered directly with Paper, `theme.paper.colors` gives the raw MD3 color roles (`primary`, `onPrimary`, `primaryContainer`, `surfaceVariant`, `elevation.level1`-`level5`, ...).
- **Never hardcode hex colors** in a screen or component. If an existing token doesn't fit, add a new semantic token to `AppTheme`/`buildTheme()` in `palette.ts` (light + dark) rather than inlining a color.
- **Dark mode is automatic** via `ThemeProvider` (light/dark/system, persisted in AsyncStorage) — never assume light-only; check both when reviewing a change.
- **Reuse existing shared components first** — `src/components/`: `Card`, `Surface`, `ScreenHeader`, `SectionHeader`, `StatusBadge`, `DetailRow`, `FormRow`, `SelectModal`, `SettingsRow`, `Toast`, `AppTabBar`, `ItemIcon`. Extend one of these before creating a new primitive that duplicates it.

## M3 principles to follow

- **Color roles, not raw colors** — use primary/secondary/tertiary and their `*Container`/`on*` pairs from the theme, not arbitrary hex values.
- **Tonal elevation, not drop shadows** — surfaces gain elevation via `colors.elevation.levelN` (tonal surface tint), matching Paper's M3 `Surface`/`Card`, not `boxShadow`/`elevation` hacks with custom shadow colors.
- **Type scale** — use Paper's M3 `Text variant="..."` scale (`displayLarge` … `labelSmall`) instead of ad hoc `fontSize`/`fontWeight` combinations.
- **Shape** — M3 rounded-corner scale (extra-small → extra-large) via Paper defaults/theme `roundness`, applied consistently across cards, buttons, sheets, and modals.
- **State layers** — rely on Paper's built-in pressed/hover/focus/disabled state layers rather than custom opacity/color overlays.
- **Spacing** — 8dp grid, consistent with CLAUDE.md's "large touch targets, clear spacing" UI guideline.

## Design reference

Follow the existing `.claude/rules/design-reference.md` and `.claude/rules/ui-design.md` rules: `docs/design/` (e.g. `app-design.png`) is the source of truth when a mockup exists — match it exactly. When no mockup exists for the work at hand, default to clean M3 patterns consistent with the rest of the app (existing screens/components), not a new visual style.

## Do NOT

- Do not introduce a different design system, component library, or ad hoc styling approach (styled-components, custom CSS-like tokens, another Material version) — per CLAUDE.md's Dependency Policy, a new UI dependency must solve a real problem Paper/M3 can't.
- Do not bypass the theme with inline hex colors or magic numbers for spacing/radius that already have a token.
- Do not build a new one-off component when an existing shared component in `src/components/` already covers the case.
- Do not design light-only and leave dark mode broken or unchecked.

## Self review

Before finishing:

- Confirm every color comes from `useAppTheme()` / `theme.paper.colors` — grep the diff for stray hex codes.
- Confirm the change looks correct in both light and dark mode.
- Confirm touch targets and spacing follow the 8dp/M3 conventions already used elsewhere in the app.
- If a design reference exists in `docs/design/`, compare against it per the fidelity checklist in `ui-design.md`.
