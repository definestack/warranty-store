## 1. Data model and migration

- [ ] 1.1 Write a failing test in `src/db/migrations.test.ts` asserting migration 6 adds a
  nullable `photo_uri` column to `warranty_items`, that existing rows survive with
  `photo_uri` NULL, and that migrating from version 5 is idempotent on re-run.
      GitHub: #70
- [ ] 1.2 Add `ADD_PHOTO_URI_COLUMN` to `src/db/schema.ts` and migration 6
  `add_photo_uri_to_warranty_items` to `src/db/migrations.ts`; make 1.1 pass.
      GitHub: #70
- [ ] 1.3 Add optional `photoUri?: string` to `WarrantyItem` in `src/types/warranty.ts` and
  confirm `NewWarrantyItem` / `WarrantyItemUpdate` pick it up without other edits.
      GitHub: #70

## 2. Repository

- [ ] 2.1 Write failing tests in `src/db/warrantyRepository.test.ts`: `createItem` persists
  `photoUri` and round-trips it through `getItemById` / `getAllItems`; an item created
  without one reads back `undefined`.
      GitHub: #70
- [ ] 2.2 Write failing tests for update semantics: `updateItem` with an explicit
  `photoUri: undefined` clears the stored photo, and an update that omits the key preserves
  it (per design.md — "`photoUri: undefined` in an update means remove").
      GitHub: #70
- [ ] 2.3 Write a failing test that `insertImportedItems` preserves `photoUri` exactly as
  given, including items with no photo.
      GitHub: #70
- [ ] 2.4 Implement: extend `WarrantyItemRow`, `mapRowToItem`, the `createItem` INSERT, the
  `updateItem` UPDATE and the `insertImportedItems` INSERT in
  `src/db/warrantyRepository.ts`; document the explicit-undefined-clears behaviour at
  `updateItem`. Make 2.1–2.3 pass.
      GitHub: #70

## 3. File and picker services

- [ ] 3.1 Write failing tests in `src/services/fileService.test.ts`: `saveItemPhoto` copies
  into `documentDirectory/photos/` as `photo-<uuid>.jpg`, compresses only when above the
  1600px threshold, falls back to the original on compression failure, and
  `deleteItemPhotoFile` deletes an existing file and no-ops (without throwing) on a missing
  one.
      GitHub: #71
- [ ] 3.2 Refactor `src/services/fileService.ts` so the compress-and-copy logic is a shared
  internal helper parameterised by target directory and filename prefix; implement
  `saveItemPhoto` and `deleteItemPhotoFile` on top of it, leaving `saveInvoiceImage`,
  `writeInvoiceImageFile` and `deleteInvoiceFile` exports and behaviour unchanged. Make 3.1
  pass; confirm existing fileService tests still pass.
      GitHub: #71
- [ ] 3.3 Add `writeItemPhotoFile(fileName, base64)` (photos counterpart of
  `writeInvoiceImageFile`) with a test covering the written path.
      GitHub: #71
- [ ] 3.4 Write failing tests in `src/services/imageService.test.ts` for
  `pickItemPhotoFromCamera` / `pickItemPhotoFromGallery`: `permission-denied` when the
  permission is refused, `canceled` when the picker is dismissed or returns no asset, and
  `success` with a single app-private URI otherwise.
      GitHub: #71
- [ ] 3.5 Implement both pickers in `src/services/imageService.ts` returning an
  `ItemPhotoPickResult` (single URI, gallery limited to one selection), delegating storage
  to `saveItemPhoto`. Make 3.4 pass.
      GitHub: #71

## 4. Item deletion cleanup

- [ ] 4.1 Write a failing test in `src/store/itemsStore.test.ts` that `deleteItem` deletes
  the item's photo file alongside its invoice images, and that a photo-file delete failure
  still leaves the item deleted.
      GitHub: #74
- [ ] 4.2 Implement the photo cleanup in `src/store/itemsStore.ts`; make 4.1 pass.
      GitHub: #74

## 5. Backup and restore

- [ ] 5.1 Write failing tests in `src/services/backupService.test.ts`: `buildBackupPayload`
  rewrites `photoUri` to `photos/<itemId><ext>` and leaves items without a photo untouched;
  `createBackupArchive` writes the photo file into the archive under that path;
  `formatVersion` stays 1.
      GitHub: #75
- [ ] 5.2 Implement photo packing in `src/services/backupService.ts`; make 5.1 pass.
      GitHub: #75
- [ ] 5.3 Write failing tests in `src/services/restoreService.test.ts`: a `photoUri` is
  validated as an optional string and restored to app-private storage; a payload with no
  `photoUri` (pre-change backup) imports cleanly with no photo; a `photoUri` naming a file
  missing from the archive, or one whose write fails, imports the item without a photo
  rather than failing the import; a non-string `photoUri` is rejected as invalid like other
  malformed fields.
      GitHub: #75
- [ ] 5.4 Implement photo validation and unpacking in `src/services/restoreService.ts` using
  `writeItemPhotoFile`; make 5.3 pass.
      GitHub: #75

## 6. Display

- [ ] 6.1 Add an optional `photoUri` prop to `src/components/ItemIcon.tsx` that renders the
  photo inside the existing sized/rounded box (same `size`, `borderRadius: size * 0.28`,
  `overflow: 'hidden'`, `resizeMode: 'cover'`) and falls back to the category icon via an
  `onError` handler.
      GitHub: #72
- [ ] 6.2 Pass `photoUri={item.photoUri}` from `src/screens/HomeScreen.tsx` in both the
  "Expiring Soon" cards (size 36) and the item list rows (size 44), changing nothing else.
      GitHub: #72
- [ ] 6.3 Pass `photoUri={item.photoUri}` from the `ItemDetailScreen` summary card
  (size 56).
      GitHub: #72

## 7. Add/Edit Item screen

- [ ] 7.1 Replace `handlePickPhoto`'s direct gallery call with the shared `SelectModal`
  source chooser offering **Take photo** and **Choose from Gallery**, plus **Remove photo**
  only when a photo is attached; reuse `showInvoicePermissionAlert` for permission denial.
      GitHub: #73
- [ ] 7.2 Introduce `photoDraft: { uri, isPersisted } | null` seeded from the loaded item
  (`isPersisted: true`), and wire pick / replace / remove per the transition table in
  design.md — an unsaved file being superseded or removed is deleted immediately.
      GitHub: #73
- [ ] 7.3 Add unmount cleanup (`useEffect(() => cleanup, [])` over a ref) that deletes a
  still-unsaved photo file when the user leaves without saving, and is disarmed once a save
  commits.
      GitHub: #73
- [ ] 7.4 Include `photoUri` in both the `createItem` and `updateItem` calls in `handleSave`
  (always passing the key explicitly so removal clears it), and delete a superseded
  persisted photo file only after the write succeeds.
      GitHub: #73
- [ ] 7.5 Report a photo save failure with the existing toast pattern without aborting the
  item save (mirroring `invoiceSaveFailed`).
      GitHub: #73

## 8. Localization

- [ ] 8.1 Add the new `addEditItem` keys (remove-photo option label, photo-save failure
  message, and a photo source chooser title) to `src/i18n/locales/en.ts`.
      GitHub: #73
- [ ] 8.2 Mirror the same keys in `es.ts`, `fr.ts` and `de.ts`, and confirm
  `src/i18n/i18n.test.ts`'s key-parity check passes.
      GitHub: #73

## 9. Verification

- [ ] 9.1 Run `npm test` — all suites pass, including the new ones.
      GitHub: #70, #71, #72, #73, #74, #75
- [ ] 9.2 Run `npm run typecheck` and `npm run lint` — both clean.
      GitHub: #70, #71, #72, #73, #74, #75
- [ ] 9.3 Manually verify on the Android emulator/device: attach from camera, attach from
  gallery, replace, remove, cancel out of the picker, deny each permission and confirm the
  Settings prompt, leave the screen without saving, and confirm the photo appears in the
  list rows, the Expiring Soon cards and the detail summary.
      GitHub: #72, #73
- [ ] 9.4 Manually verify a backup export/import round-trip preserves item photos, and that
  a backup taken before this change still imports.
      GitHub: #75
- [ ] 9.5 Compare the Add/Edit screen against `docs/design/app-design.png` and confirm the
  photo card's layout is unchanged.
      GitHub: #73
