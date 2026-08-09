---
paths:
  - "src/*"
---

## When no Sample UI is provided
- Design a clean, modern, user-friendly UI.
- Follow existing application styling and conventions.
- Prefer maintainability and reusable components.

# When Sample UI is available

## Primary Objective
- Reproduce the sample UI as faithfully as possible.
- Visual fidelity takes precedence over implementation elegance.

## Required
- Treat the sample UI as the single source of truth.
- Match the overall layout exactly.
- Match control hierarchy and positioning.
- Match spacing and alignment.
- Match control sizes and proportions.
- Match typography (font family, size, weight).
- Match colors, borders, corner radius and shadows.
- Match icons and icon placement.
- Match padding and margins.
- Match visual density.
- Preserve whitespace.
- Preserve the visual hierarchy.

## Do NOT
- Do not redesign the interface.
- Do not modernize the design.
- Do not simplify layouts.
- Do not substitute one layout with another.
- Do not add or remove controls unless explicitly requested.
- Do not replace fixed spacing with "better" responsive layouts.
- Do not change colors or typography because they "look better."
- Do not introduce your own design decisions.

### Self Review
Before finishing:

- Compare the generated UI against the sample.
- List any remaining visual differences.
- Revise the XAML until no significant visual differences remain.

