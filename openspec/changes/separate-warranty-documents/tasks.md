# Tasks

Ordered by dependency. Groups 1–5 follow the repository's TDD requirement for `db/`,
`services/` and store logic: the failing test comes first in each pair.

The shared type change in 1.4 makes `npm run typecheck` red until group 8 lands. That is
expected — it is the compiler enumerating the call sites to update, and it is the checklist
for groups 3–8. Do not paper over it with casts.

Reclassifying a document between sections was originally in scope and its data layer was
built and tested, then removed once it was established that nothing is in production: its
justification was recovering documents that migration 7 files under Invoice, and no such
documents exist. See design.md — Decision 6.

## 1. Data model and migration

- [x] 1.1 Write a failing migration test: applying migration 7 to a database at version 6
      adds the document kind column, and every pre-existing document row reads back as an
      invoice document with no explicit backfill statement.
- [x] 1.2 Write a failing migration test: a database already at version 7 has no pending
      migrations and is not re-applied or altered a second time.
- [x] 1.3 Add the `ADD_DOCUMENT_KIND_COLUMN` DDL constant to `src/db/schema.ts` and
      register migration 7 in `src/db/migrations.ts`. Additive `ALTER TABLE ... ADD COLUMN
      kind TEXT NOT NULL DEFAULT 'invoice'` only — no table rename, no rewrite, no drop.
- [x] 1.4 Update `src/types/warranty.ts`: rename `InvoiceImage` to `ItemDocument`, add its
      `kind: 'invoice' | 'warranty'`, and replace `WarrantyItem.invoiceImages` with the two
      pre-grouped lists per design.md — Decision 3.

## 2. Document repository

- [x] 2.1 Write failing tests for per-item reads: documents come back grouped into the two
      kinds, each ordered independently and densely from the first position.
- [x] 2.2 Write failing tests for the multi-item read used by the list screen: the same
      grouping holds per item, and an item with no documents yields two empty lists.
- [x] 2.3 Implement the grouped reads in `src/db/invoiceImagesRepository.ts`.
- [x] 2.4 Write failing tests for kind-scoped reconciliation on save: reconciling one kind
      leaves the other kind's rows and ordering untouched, removals close the gap, and each
      kind is renumbered from its first position.
- [x] 2.5 Implement kind-scoped reconciliation, replacing the single flat-list reconcile.

## 3. Item repository

- [x] 3.1 Write a failing test that a read item exposes its documents already grouped by
      kind, and that importing preserves each document's kind, id and ordering verbatim.
- [x] 3.2 Update the row mapper and `insertImportedItems` in
      `src/db/warrantyRepository.ts` to carry kind through.
- [x] 3.3 Write a failing test that deleting an item removes its document rows of both
      kinds, then confirm `deleteItem` still satisfies it.

## 4. File and image services

- [x] 4.1 Replace `MAX_INVOICE_PAGES` with `MAX_DOCUMENTS_PER_KIND` and document that the
      cap is now per kind rather than per item. Keep the value at 10. Placed in
      `src/utils/documents.ts` rather than the picker, following `utils/categories.ts`.
- [x] 4.2 Make the picker entry points kind-agnostic so a single set of pick/save functions
      serves both sections. Keep the shared `invoices/` directory and the existing filename
      prefix, and add a comment pointing at design.md — Decision 2 so the next reader does
      not infer meaning from the name.
- [x] 4.3 Write a failing test that deleting an item discards the stored images of both
      kinds, then update `src/store/itemsStore.ts` to satisfy it.

## 5. Backup and restore

- [x] 5.1 Write a failing test that an exported payload records each document's kind and
      that both kinds coexist in the archive without a filename collision.
- [x] 5.2 Update `src/services/backupService.ts` to emit the kind. Leave the format version
      and the archive folder layout unchanged, per design.md — Decision 5. Both kinds share
      the single legacy `invoiceImages` list: a separate key would make pre-split builds
      drop warranty documents entirely rather than degrade.
- [x] 5.3 Write failing restore tests: a round trip restores each document to the kind it
      was exported from; an archive whose entries omit the kind imports every document as an
      invoice; an archive is never rejected solely over how kinds are recorded; a document
      whose image is missing is dropped without failing the item.
- [x] 5.4 Update `src/services/restoreService.ts` validation to accept an optional kind,
      defaulting a missing or unrecognised value to invoice.

## 6. Localization

- [x] 6.1 Add the new keys to `src/i18n/locales/en.ts`: the two section labels, the
      manufacturer warranty section heading, the per-section add/replace/remove/reorder
      labels, and the per-section limit message. Retire keys the split makes dead.
- [x] 6.2 Mirror the same keys into `es.ts`, `fr.ts` and `de.ts`, keeping the existing key
      ordering and pluralization shape.

## 7. Add/Edit item screen

- [ ] 7.1 Save the reference mockup into `docs/design/`. `.claude/rules/design-reference.md`
      makes that directory the single source of truth for UI work, and the mockup currently
      exists only in conversation. Manual step — the image is not in the repository.
- [x] 7.2 Parameterise the existing attach, replace, remove and reorder handlers by kind
      instead of duplicating the handler set — duplication is how the two sections drift
      (design.md — Risks).
- [x] 7.3 Add the manufacturer warranty section and move the warranty period field and the
      valid-until display into it, alongside its documents.
- [x] 7.4 Render valid-until as read-only and derived, with the calculated-from-purchase-date
      caption. Do **not** reproduce the mockup's calendar affordance on that row — it would
      let an expiry date be supplied rather than derived and silently break the status badge,
      filters and reminder scheduling (design.md — Risks).
- [x] 7.5 Enforce and message the per-section cap of 10, including when a multi-selection
      exceeds the target section's remaining capacity.
- [x] 7.6 Reconcile both kinds on save, and discard the stored images of documents that were
      replaced, removed, or attached and then abandoned by leaving without saving.

## 8. Item detail screen

- [x] 8.1 Render the two sections separately, each with its own heading, showing neither
      when the item has no documents of that kind.
- [x] 8.2 Scope the full-screen viewer to the tapped section so paging stays within one
      kind, and update `src/components/InvoiceImageViewer.tsx` naming to match the document
      vocabulary.

## 9. Verification

- [x] 9.1 `npm test` — all suites green, including the new migration, reconciliation and
      restore tests.
- [x] 9.2 `npm run typecheck` and `npm run lint` clean; confirm no remaining references to
      the old single-list field or the old cap constant.
- [x] 9.3 `npx expo-doctor` and `npx expo export --platform android` succeed, matching CI.
- [ ] 9.4 On an Android emulator, verify against an installation created **before** this
      change: existing documents all appear under Invoice and none are missing.
- [ ] 9.5 On the emulator, export a backup and re-import it into a fresh install; confirm
      each document returns to the section it was exported from.
- [ ] 9.6 Confirm no new Expo runtime warnings.
