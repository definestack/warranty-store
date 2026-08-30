# Tasks

Ordered by dependency. Groups 1–8 follow the repository's TDD requirement for `db/`,
`services/`, `utils/` and store logic: the failing test comes first in each pair.

The type changes in 3.5, and the widened status union in 10.1, make `npm run typecheck` red
until group 12 lands. That is expected — it is the compiler enumerating the call sites to
update, and it is the checklist for groups 5–12. Do not paper over it with casts.

Group 6 must land as one unit. Splitting it leaves the app reading `expiryDate` for status
in some screens and `coverageEndDate` in others, which is the exact divergence design.md —
Decision 4 exists to prevent.

## 1. Prerequisites

- [ ] 1.1 Save the Add/Edit extended warranty section mockup to
      `docs/design/extended-warranty-section.png`, per `.claude/rules/design-reference.md`.
      Groups 10 and 11 are measured against it.
- [ ] 1.2 Save the redesigned Item Detail mockup to
      `docs/design/item-detail-coverage.png`. Group 12 is measured against it.
- [ ] 1.3 Confirm `separate-warranty-documents` is archived or its specs synced, so this
      change's `item-documents` delta has a base spec to merge onto. See design.md —
      Risks.

## 2. Coverage arithmetic

- [x] 2.1 Write failing tests for `src/utils/coverage.ts`: a duration value plus unit
      resolves to months, with years multiplying by twelve and months passing through.
- [x] 2.2 Write failing tests for end-date derivation: the derived end date is the start
      date plus the duration minus one day, so a period starting the day after a previous
      one ends leaves no gap and no overlap. Pin the inherited `addMonths` month-overflow
      behaviour explicitly (design.md — Decision 3), the same way the existing expiry test
      pins it.
- [x] 2.3 Write failing tests for the coverage end date: it is the item's expiry date when
      there are no extended warranties, and otherwise the latest of the expiry date and
      every extended warranty's end date — including when an extended warranty ends *before*
      the manufacturer warranty does.
- [x] 2.4 Write failing tests for the default start date of the next extended warranty: the
      day after the manufacturer valid-till date when there are none, and the day after the
      last one's end date when there are.
- [x] 2.5 Write failing tests for the coverage signature: it changes when a period is added,
      removed, or has its end date moved, and is unchanged when only the item's name or
      notes change.
- [x] 2.6 Write failing tests for a period's own state: a period whose start date is in the
      future is upcoming, one whose end date has passed is expired, one ending inside the
      near-expiry window is expiring, and any other running period is active. Cover the
      boundaries — the start date itself and the end date itself.
- [x] 2.7 Write failing tests for the countdown: an upcoming period counts up to its start
      date and every other state counts down to its end date, reusing the existing
      days-remaining arithmetic rather than reimplementing it.
- [x] 2.8 Write a failing test that a period's state does not change the item's own state:
      an item whose only extended warranty is upcoming still reports the state its coverage
      end date gives it.
- [x] 2.9 Implement `src/utils/coverage.ts` as pure functions with no I/O.

## 3. Data model and migrations

- [x] 3.1 Write a failing migration test: applying migration 8 to a database at version 7
      creates the extended warranties table, and existing items are unaffected and hold no
      extended warranties.
- [x] 3.2 Write a failing migration test: applying migration 9 adds the nullable extended
      warranty reference to both the documents table and the notification schedules table,
      every pre-existing document row reads back as belonging to the item itself, and every
      pre-existing schedule row reads back as a manufacturer-period reminder — with no
      backfill statement.
- [x] 3.3 Write a failing migration test: a database already at version 9 has no pending
      migrations and is not re-applied.
- [x] 3.4 Add the DDL constants to `src/db/schema.ts` and register migrations 8 and 9 in
      `src/db/migrations.ts`. Additive only — no rename, no rewrite, no drop.
- [x] 3.5 Update `src/types/warranty.ts`: add `ExtendedWarranty` and its duration unit, add
      `extendedWarranties` and the derived `coverageEndDate` to `WarrantyItem`, and add the
      optional extended warranty reference to `ItemDocument`. Add the same reference to
      `NotificationSchedule` in `src/types/notification.ts`.

## 4. Extended warranty repository

- [x] 4.1 Write failing tests for reads: an item's extended warranties come back in a stable
      order, densely numbered from the first position, each carrying its own documents
      grouped by kind; an item with none yields an empty list.
- [x] 4.2 Write failing tests for the multi-item read used by the list screen: the same
      grouping holds per item and an item with none yields an empty list rather than
      undefined.
- [x] 4.3 Write failing tests for reconciliation on save: removals delete their rows and
      close the numbering gap, edits update in place, new entries insert with the id they
      were given, and the returned removed-ids let the caller clean up.
- [x] 4.4 Write a failing test that the end date is derived on every insert and update and
      is never taken from the caller, even when the caller supplies one.
- [x] 4.5 Write failing tests for validation at the repository boundary: a non-positive or
      fractional duration and a negative cost are rejected.
- [x] 4.6 Implement `src/db/extendedWarrantyRepository.ts` per design.md — Decision 9.

## 5. Document scoping

- [x] 5.1 Write failing tests for scoped reads: documents come back grouped by kind within
      each scope, each scope's ordering independent, and an item's own documents never mixed
      with an extended warranty's.
- [x] 5.2 Write failing tests for scoped reconciliation: saving one scope's kind leaves every
      other scope and kind untouched, and each is renumbered from its first position.
- [x] 5.3 Write a failing test that the per-section limit is counted per scope per kind, so a
      full item invoice section does not restrict an extended warranty's.
- [x] 5.4 Rework `src/db/invoiceImagesRepository.ts` to take a scope object rather than a
      bare kind, per design.md — Decision 5. Keep `item_id` populated on every row.
- [x] 5.5 Update the limit's documentation comment in `src/utils/documents.ts` to state that
      it is counted per scope per kind. Value and name unchanged.

## 6. Item repository and coverage-aware status

Land 6.3–6.8 together — see the note at the top of this file.

- [x] 6.1 Write failing tests for the item mapper: an item's extended warranties are loaded
      with it, and its coverage end date is the derived maximum, for the single-item read
      and the list read alike.
- [x] 6.2 Write a failing test that deleting an item removes its extended warranties along
      with its documents and schedules, inside the existing transaction.
- [x] 6.3 Implement the mapper and delete changes in `src/db/warrantyRepository.ts`. Leave
      `expiry_date` and its derivation exactly as they are.
- [x] 6.4 Write failing tests for `src/utils/itemFilters.ts`: an item whose manufacturer
      warranty has expired but whose extended warranty is live is not expired, appears in
      the expiring-soon list when that extended cover ends within 30 days, and is ordered by
      that date.
- [x] 6.5 Update `src/utils/itemFilters.ts` to read the coverage end date.
- [x] 6.6 Write a failing test for `src/store/notificationsStore.ts`: an item kept alive only
      by an extended warranty is not filtered out as expired.
- [x] 6.7 Update `src/store/notificationsStore.ts` and `src/services/restoreService.ts`'s
      non-expired filter to read the coverage end date.
- [x] 6.8 Update `src/screens/HomeScreen.tsx` and `src/screens/ItemDetailScreen.tsx` to read
      the coverage end date for the status badge and the days-remaining text. The detail
      screen keeps showing the manufacturer valid-till date in its own right.

## 7. Reminders per coverage period

- [x] 7.1 Write failing tests for period planning: an item yields one period for its
      manufacturer warranty plus one per extended warranty, each with its own end date, and
      periods that have already ended plan no reminders.
- [x] 7.2 Write failing tests for scheduling: each period gets its own 30/7/0-day reminders
      for the moments still in the future, each carrying the item id so a tap still opens
      the item, and a failure on one reminder does not lose the others.
- [x] 7.3 Write failing tests for the reschedule decision: adding an extended warranty,
      removing one, and moving one's end date each require rescheduling; a name-only edit
      does not.
- [x] 7.4 Implement period planning and per-period scheduling in
      `src/services/notificationService.ts`, replacing `hasExpiryDateChanged` with the
      coverage-signature comparison per design.md — Decision 7.
- [x] 7.5 Write failing tests for `src/db/notificationSchedulesRepository.ts`: schedules
      persist which period they belong to, a row with no reference reads back as the
      manufacturer period, and reading and deleting by item still returns and removes every
      period's schedules.
- [x] 7.6 Implement the schedules repository changes.
- [x] 7.7 Write a failing test for `src/store/itemsStore.ts`: deleting an item cancels the
      reminders of every one of its periods and deletes its documents' files across every
      scope.
- [x] 7.8 Implement the `itemsStore` delete changes.

## 8. Backup and restore

- [x] 8.1 Write a failing test for export: an item's extended warranties are written with
      their fields, dates and order, and each one's documents are nested inside its own
      entry rather than in the item's flat document list. The format version stays 1.
- [x] 8.2 Write a failing test for export: an extended warranty document's image is written
      into the archive and referenced by its relative path, like every other document.
- [x] 8.3 Implement the export changes in `src/services/backupService.ts`.
- [x] 8.4 Write failing tests for import: an exported extended warranty is restored to the
      same item with the same fields, dates, order and documents; an archive whose items
      record no extended warranties imports unchanged; and an archive predating extended
      warranties is accepted rather than rejected.
- [x] 8.5 Write a failing test for import: a missing or unwritable extended warranty document
      image is dropped without failing the extended warranty or the item.
- [x] 8.6 Write a failing test for import: reminders scheduled for imported items cover every
      period, not only the manufacturer one.
- [x] 8.7 Implement the import changes in `src/services/restoreService.ts`, including
      inserting the extended warranty rows in `insertImportedItems` with their exported ids
      and dates preserved.

## 9. Copy

- [x] 9.1 Add the edit section's strings — section title and optional-toggle label,
      provider, duration and its unit options, starts-on, ends-on and its calculated
      caption, cost, notes, the two document sub-section labels and their add controls, the
      add-another control, the remove-and-confirm copy, the per-field validation messages,
      and the "how it works" explainer — to `src/i18n/locales/en.ts`.
- [x] 9.2 Add the detail screen's strings to `en`: the covered-till summary line, the
      Original Bills / Invoices heading and its subtitle, the Warranty Coverage heading, the
      Add Extended Warranty control, the Original Warranty (Manufacturer) and Extended
      Warranty entry titles, the Original Warranty Valid Till and Extended Warranty Valid
      Till row labels, the provider/duration/cost column labels, the `upcoming` status label
      and the starts-in countdown, and the document tile menu items.
- [x] 9.3 Add all of the above keys to `es`, `fr` and `de`, and run the existing i18n parity
      test.

## 10. Shared components and navigation

- [x] 10.1 Widen `WarrantyStatus` in `src/components/StatusBadge.tsx` with `upcoming` and
      extend both exhaustive maps — the label key and the colour pair — using existing
      theme tokens. Let the compiler find the call sites rather than searching for them.
- [x] 10.2 Add the optional section-focus parameter to the `AddEditItem` route in
      `src/types/navigation.ts`, per design.md — Decision 11. Existing navigation to the
      route without it must keep compiling and behaving identically.
- [x] 10.3 Build `src/components/ExtendedWarrantyCard.tsx` as a presentational component
      driven by props: the provider field, the duration value and unit selector, the
      editable start date, the read-only derived end date, cost, notes, the two document
      strips with their own add controls, and the remove control. Reuse `FormRow`,
      `SelectModal`, `Card` and the existing document tile treatment.
- [x] 10.4 Match the mockup saved in 1.1 for layout, spacing, control sizes, typography,
      colours, corner radius and icon placement, per `.claude/rules/ui-design.md`. Reproduce
      the collapse affordance and the "how it works" panel.
- [x] 10.5 Support dark mode through the existing theme, as the surrounding cards do.
- [x] 10.6 List the remaining visual differences against the mockup and the reason for each
      — the PDF badges, filenames and file sizes are known, confirmed divergences
      (proposal.md — Non-goals).

## 11. Add/Edit screen

- [x] 11.1 Add extended warranty drafts to `AddEditItemScreen`, minting each one's id when it
      is added so its documents can reference it before it is saved, per design.md —
      Decision 6.
- [x] 11.2 Render the optional section: the toggle, one card per extended warranty, the
      add-another control, and the confirmation before discarding recorded extended
      warranties when the section is turned off.
- [x] 11.3 Default each new extended warranty's start date from the current cover end, and
      recompute the displayed end date live as the start date or duration changes.
- [x] 11.4 Route the per-card document add, replace, remove and reorder actions through the
      scoped document handlers, enforcing the limit per scope per kind.
- [x] 11.5 Extend validation and the save gate to the extended warranty fields, identifying
      which card and which field is at fault without blocking on the optional ones.
- [x] 11.6 Extend `handleSave` to reconcile the extended warranties, then reconcile each
      scope's documents, then clean up the files of removed extended warranties and removed
      documents, then reschedule reminders when the coverage signature changed.
- [x] 11.7 Discard the images of extended warranties added and then abandoned by leaving the
      screen without saving, the way abandoned item documents and photos already are.

## 12. Item detail screen

Measured against the mockup saved in 1.2. The screen stays read-only throughout — see
design.md — Decision 11.

- [x] 12.1 Derive the screen's `CoveragePeriod` list per design.md — Decision 12: the
      manufacturer warranty mapped into the same shape as the extended warranties, then each
      extended warranty in stored order. The manufacturer entry must not be special-cased in
      the JSX.
- [x] 12.2 Build `src/components/CoveragePeriodCard.tsx`: the state chip, the date range,
      the countdown line, the optional provider/duration/cost row, and the entry's document
      sections. One component renders every entry.
- [x] 12.3 Build the timeline wrapper that draws the connecting rail and the per-entry
      leading icon between cards, as drawn in the mockup.
- [x] 12.4 Rework the summary card: photo, name, category, the item's status badge, and the
      covered-till line reading the coverage end date and its days remaining.
- [x] 12.5 Rework the details card to the mockup's rows — Brand, Category, Purchase Date,
      Purchase Price, Store, Original Warranty Valid Till, and Extended Warranty Valid Till
      shown only when the item has extended cover. Drop the Warranty Period row; its
      duration now appears against its period. Keep optional rows hidden when unset, as they
      are today.
- [x] 12.6 Add the Original Bills / Invoices section card with its subtitle and its Add
      Invoice control, holding the item's own invoice documents.
- [x] 12.7 Render every document section even when empty, with its add affordance reachable,
      replacing the current behaviour of hiding an empty section.
- [x] 12.8 Wire every add control — Add Invoice, each section's Add More, and Add Extended
      Warranty — to navigate to the editor at the matching section using the parameter from
      10.2. None of them may write anything.
- [x] 12.9 Add the per-tile overflow menu offering viewing the document and jumping to the
      editor, and keep tapping the tile itself opening the existing document viewer, paging
      within that section only.
- [x] 12.10 Keep Notes, rendered only when the item has some. Recorded divergence from the
      mockup — design.md — Risks.
- [x] 12.11 Pin the Edit Item and Delete Item actions to the bottom bar as drawn, keeping the
      existing delete confirmation and its behaviour.
- [x] 12.12 Confirm returning from the editor shows what was saved; the screen already
      reloads the item on focus, so this should need no new code — verify rather than add.
- [x] 12.13 Support dark mode, and list the remaining visual differences against the mockup
      with the reason for each. The PDF badges, filenames, file sizes, the dropped Warranty
      Period row and the retained Notes section are known, recorded divergences.

## 13. Verification

- [ ] 13.1 Run `npm test` — all suites green, including the new coverage, migration,
      repository, notification and backup/restore tests.
- [ ] 13.2 Run `npm run typecheck` and `npm run lint` clean.
- [ ] 13.3 Verify on the Android emulator against an upgraded database that already holds
      items, documents and scheduled reminders: existing items are unchanged and still show
      the same status; adding an extended warranty moves the item's status and days-remaining
      onto the new end date; its documents open from the detail screen; removing it restores
      the previous status; and no Expo runtime warnings are raised.
- [ ] 13.4 Verify the detail screen on the emulator across the states the mockup does not
      show: an item with no extended warranty, one whose extended cover is upcoming, one
      whose manufacturer warranty has expired while the extended cover runs, one with every
      document section empty, and one with several extended warranties. Each add control
      lands on the right section of the editor, and returning shows what was saved.
- [ ] 13.5 Export a library holding extended warranties, re-import it into a fresh install,
      and confirm the extended cover, its order and its documents come back intact.
