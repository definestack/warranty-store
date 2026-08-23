## Context

See `proposal.md` — Why. What matters for the approach:

- The photo card already exists in `AddEditItemScreen` (`photoUri` state, `handlePickPhoto`),
  but it opens the gallery directly and its result is dropped on save. There is no column
  for it.
- The invoice attachment flow next to it already solves nearly the same problem end to end:
  a `SelectModal` source chooser (camera / gallery), permission handling with a
  "open Settings" alert, copy-into-app-storage with compression, draft state that is
  reconciled on save, and orphan-file deletion. Item photos should reuse that machinery
  rather than grow a parallel one.
- `docs/design/app-design.png` is the source of truth for this screen and shows the photo
  card as it exists today. The design below keeps that card's layout untouched.
- Migrations are additive-only and applied one-per-transaction; `__mocks__/expo-sqlite.ts`
  runs real SQL, so schema and repository changes are testable.
- Backup format version 1 is read by `restoreService` with per-field validation and a
  documented tolerance for missing/older fields.

## Goals / Non-Goals

**Goals:**

- One photo per item, persisted in SQLite as a URI only, file in app-private storage.
- Reuse the invoice image pipeline (pick → compress → copy → delete-when-orphaned) instead
  of duplicating it.
- Keep `WarrantyItem` and every exported repository/service signature backward compatible.
- Keep backup archives interchangeable in both directions across this change.

**Non-Goals:**

- Multiple photos per item, cropping, rotating, or a full-screen photo viewer.
- Changing the photo card's layout, or any other part of `docs/design/app-design.png`.
- Refactoring `AddEditItemScreen`'s save orchestration into a store — the baseline notes
  this as a known structural issue; this change follows the existing pattern rather than
  fixing it.
- Touching the legacy `warranty_items.invoice_uri` column.

## Decisions

### Store the photo as a column on `warranty_items`, not a child table

A nullable `photo_uri TEXT` added by migration 6. One photo per item makes a child table
(the shape `invoice_images` uses) pure overhead: an extra query per read, an extra delete
in every transaction, and a join to keep ordered for no ordering.

*Alternative considered:* reusing `invoice_images` with a discriminator column. Rejected —
it would make every existing invoice query filter on the discriminator, which is a
riskier edit to working, tested code than adding a column nothing else reads.

*Rejected:* reviving the dormant `invoice_uri` column. It has legacy meaning (migration 4
backfilled from it) and reusing it for a different concept would poison that history.

### Photos live in `documentDirectory/photos/`, separate from `invoices/`

Named `photo-<uuid>.jpg`, mirroring `invoice-<uuid>.jpg`. A separate directory keeps the
backup packer's directory listing unambiguous and means an item's photo can never be
mistaken for an invoice page during cleanup.

`fileService` gains an internal helper carrying today's `compressIfNeeded` + `copyAsync`
logic parameterised by target directory and filename prefix; `saveInvoiceImage` and the new
`saveItemPhoto` both delegate to it, so both get identical resize (max 1600) and compress
(0.8) behaviour with the same fall-back-to-original-on-failure policy. `deleteInvoiceFile`
keeps its name and gains a sibling `deleteItemPhotoFile` over the same internal delete —
existing call sites are untouched.

### The source chooser gains a "Remove photo" option

Tapping the photo card opens the same `SelectModal` the invoice flow uses, with
**Take photo** and **Choose from Gallery**, plus **Remove photo** listed only when a photo is
currently attached. This adds no controls to the card itself, so the screen still matches
`docs/design/app-design.png`, and reuses a component and interaction the user already meets
one section below.

*Alternative considered:* an X badge overlaid on the card's thumbnail. Rejected — it changes
the designed card and the `.claude/rules/ui-design.md` rules forbid adding controls to a
screen that has a reference mockup.

### Draft-then-commit lifecycle, mirroring `invoiceDrafts`

The screen holds `photoDraft: { uri: string; isPersisted: boolean } | null`, seeded from the
loaded item as `isPersisted: true`. Transitions:

| Action | Effect |
| --- | --- |
| Pick (no current photo) | new file saved, draft `{uri, isPersisted: false}` |
| Pick (replacing an unsaved draft) | new file saved, **old unsaved file deleted immediately** |
| Pick (replacing a persisted photo) | new file saved; old file deleted only after the save succeeds |
| Remove | draft cleared; an unsaved file is deleted immediately, a persisted one after save |
| Save | `photoUri` written with the item; superseded persisted file deleted afterwards |
| Leave without saving | any file with `isPersisted: false` is deleted on unmount |

Unmount cleanup runs from a `useEffect(() => cleanup, [])` reading a ref, because navigating
back does not run any handler. The ref is cleared once a save commits, so a saved photo is
never deleted by the cleanup. This is the same distinction `invoiceDrafts` already draws
with its `isPersisted` flag — the photo just has one slot instead of a list.

### `photoUri: undefined` in an update means "remove"

`updateItem` merges with `{ ...existing, ...updates }`, so an explicitly passed
`photoUri: undefined` overwrites the stored value while an omitted key preserves it.
`AddEditItemScreen` is the only caller and always passes the key explicitly, so removal is
expressible without changing `WarrantyItemUpdate` into a nullable-field type. A repository
test pins both halves of this behaviour (explicit undefined clears, omitted key preserves).

### `ItemIcon` renders the photo; callers just pass it through

`ItemIcon` takes an optional `photoUri` and, when present, renders an `Image` inside the
existing sized/rounded box instead of the `Ionicons` glyph — same `size`, same
`borderRadius: size * 0.28`, `overflow: 'hidden'`. An `onError` handler flips local state
back to the icon, which covers the missing-file case in the spec without any file-existence
check on render. `HomeScreen` (both lists) and `ItemDetailScreen` pass `photoUri={item.photoUri}`
and change in no other way.

### Backup stays format version 1

The archive gains `photos/<itemId><ext>` entries and each item's `photoUri` is rewritten to
that relative path, exactly as `invoiceImages[].uri` already is. Version 1 is retained
because the change is purely additive in both directions: older archives simply have no
`photoUri` (validated as an optional string, like `brand` and `store`), and an older build
reading a new archive ignores the unknown field. Bumping to version 2 would make new backups
unreadable by existing installs for no compatibility benefit.

Restore follows the existing per-image error policy: a `photoUri` that names a file missing
from the zip, or that fails to write, drops the photo and imports the item anyway.

### Test strategy

TDD per `CLAUDE.md` for everything below the screen: migration 6 (`migrations.test.ts`),
repository read/write/clear/import (`warrantyRepository.test.ts`), `fileService` save and
delete paths, `imageService` pick results, backup packing, restore validation and tolerance,
and `itemsStore.deleteItem` photo cleanup. The screen keeps no tests — the repo has no screen
test infrastructure and adding it is out of scope; the screen's logic is thin over the
tested services.

## Risks / Trade-offs

- **Orphaned files if the app is killed between picking and saving** → the cleanup runs on
  unmount, not on process death, so a hard kill can strand one file. Accepted: bounded to one
  compressed image, and the alternative (a reconciliation sweep over `photos/`) is more
  machinery than the problem justifies.
- **A photo file deleted outside the app leaves a dangling `photo_uri`** → `ItemIcon` falls
  back to the category icon on load error, so the item stays usable; the stale URI is
  overwritten the next time the user attaches a photo.
- **Larger backup archives** → photos are compressed to the same 1600px/0.8 budget as invoice
  pages, so an item with a photo grows the archive by roughly one invoice page.
- **`photoUri: undefined`-means-clear is subtle** → pinned by test and documented at the
  repository function; the alternative (`photoUri: string | null`) would change the shared
  `WarrantyItem` shape and ripple through backup validation for no user-visible gain.
- **Camera capture is only verifiable on a device** → the automated tests cover the picker
  wrapper against the existing `expo-image-picker` mock; actual capture, permission denial
  and the Settings deep-link are verified manually on the Android emulator/device before the
  change is considered done.

## Migration Plan

Migration 6, `add_photo_uri_to_warranty_items`, runs `ALTER TABLE warranty_items ADD COLUMN
photo_uri TEXT`. No backfill, no data rewrite, no default beyond SQL `NULL`; existing rows
read as "no photo". It is additive and applied inside the existing per-migration transaction,
so a failure leaves version 5 intact and the app keeps working without item photos.

There is no downgrade path in the app (`runMigrations` only moves forward), and none is
needed: an older build reading a database at version 6 selects `*` and ignores the unknown
column, and `INSERT`/`UPDATE` name their columns explicitly, so writes from an older build
simply leave `photo_uri` NULL.
