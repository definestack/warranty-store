## Why

The Add/Edit Item screen already shows a product-photo card ("Add Photo" / "Change Photo"),
but the picked photo is never copied into app storage and never persisted — it is silently
discarded on save. The user is offered a control that appears to work and does nothing,
and every item in the warranty list is reduced to a generic category icon, which makes a
list of several similar items (three laptops, two washing machines) hard to scan.

## What Changes

- Each warranty item gains an **optional** photo, stored in app-private storage with only
  its local URI kept in SQLite (new nullable `photo_uri` column, additive migration 6).
- The existing photo card on Add/Edit Item becomes a real picker offering **Take photo**
  (camera) and **Choose from Gallery**, matching the source chooser the invoice attachment
  already uses. Camera capture is new for this card — today it opens the gallery directly.
- The user can **replace** the photo (pick a new source) or **remove** it entirely. Both
  are reachable while adding a new item and while editing an existing one.
- The photo file is copied into app-private storage and compressed on the same terms as
  invoice images; the original gallery URI is never retained. Replaced and removed photo
  files are deleted, as are photos of deleted items, so no orphan files accumulate.
- The photo is shown **in place of the category icon** wherever an item is represented:
  Home list rows, the "Expiring Soon" cards, and the Item Detail summary. Items without a
  photo keep the current category icon, unchanged.
- Backups **include** item photos: the file is bundled into the export archive and
  restored on import. The backup format stays version 1 — the field is additive, so
  backups taken before this change still import, and an item whose photo file is missing
  or unreadable is imported without a photo rather than failing.

No breaking changes: `WarrantyItem.photoUri` is optional, so existing callers and existing
rows are unaffected. No new dependencies.

## Capabilities

### New Capabilities
- `item-photo`: whether an item may carry a photo, how the user attaches, replaces and
  removes it, where the photo is displayed in place of the category icon, and what happens
  to the stored file across save, cancel, delete, export and import.

### Modified Capabilities
<!-- None. The only existing spec, `settings`, governs Settings and navigation controls;
     its requirements are unaffected. Backup behaviour has no spec today, so the
     export/import expectations for photos are stated inside `item-photo`. -->

## Impact

- **Schema / data**: `warranty_items.photo_uri TEXT` (nullable), migration version 6.
  Additive only — existing rows read as no photo. No backfill.
- **Types**: `WarrantyItem` gains `photoUri?: string`; `NewWarrantyItem` and
  `WarrantyItemUpdate` inherit it optionally.
- **db/**: `schema.ts`, `migrations.ts`, `warrantyRepository.ts` (mapper, insert, update,
  import insert, delete path).
- **services/**: `fileService.ts` (save/delete an item photo), `imageService.ts` (pick an
  item photo from camera or gallery), `backupService.ts` (bundle the photo file),
  `restoreService.ts` (validate and unpack it).
- **store/**: `itemsStore.deleteItem` also deletes the item's photo file.
- **screens/components**: `AddEditItemScreen` (real picker, replace, remove, save, cancel
  cleanup), `ItemIcon` (renders a photo when present), `HomeScreen` and `ItemDetailScreen`
  pass the photo through.
- **i18n**: new keys in `en`, `es`, `fr`, `de`.
- **Permissions**: none new — camera and photo-library permissions are already declared
  and already requested for invoices.
- **Dependencies**: none added.
