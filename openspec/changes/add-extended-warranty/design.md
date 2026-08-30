## Context

See proposal.md — Why. The constraints that shape this design are all existing ones:

- `expiry_date` is derived at write time by `addMonths(purchase_date, warranty_months)` in
  both `createItem` and `updateItem`, never supplied by a caller. Its month-overflow
  behaviour (2026-01-31 + 1 month → 2026-03-03) is pinned by test as intended.
- `getWarrantyStatus(expiryDate)` is called from five places — Home (twice), Detail,
  `itemFilters`, `notificationsStore` and `restoreService` — each reading
  `item.expiryDate` directly.
- Documents live in `invoice_images` with a `kind` column; the table and the
  `documentDirectory/invoices/` directory keep legacy names deliberately, because the row
  carries the meaning.
- `notification_schedules` is keyed on `(item_id, reminder_kind)` in practice and is
  trusted as the only handle for cancelling OS-scheduled notifications. Nothing reconciles
  it against the OS.
- There are no foreign keys and no indexes on `item_id`; child rows are deleted explicitly
  inside the transaction in `deleteItem`.
- Item create/update orchestration lives in `AddEditItemScreen` (1145 lines) rather than in
  a store or service. That is a known structural fact of this codebase, not a target of
  this change.
- `MAX_DOCUMENTS_PER_KIND = 10` lives in `utils/documents.ts` so `db/` can enforce it
  without reaching into `services/`.
- `ItemDetailScreen` is read-only today: it renders a summary card, a details card, notes
  and two document strips, and its only writes are delete and navigation into the editor.
  Its document sections return `null` when empty. `StatusBadge` maps a three-value
  `WarrantyStatus` union onto a label key and a colour pair.

Two mockups govern this change: the extended warranty section of the Add/Edit screen, and
the redesigned Item Detail screen. Both are in `docs/design/` (tasks 1.1 and 1.2).

## Goals / Non-Goals

**Goals:**

- Add extended warranties without touching how `expiry_date` is derived or stored.
- Make one derived value — the coverage end date — the single answer to "how long is this
  item covered", so status can never disagree with itself across screens.
- Reuse the document pipeline as-is: same picker, same compression, same directory, same
  kinds, same viewer. Only the scope of a document is new.
- Keep both migrations additive and backfill-free, so an upgraded install is byte-for-byte
  correct on the first run.
- Keep `AddEditItemScreen` from growing unboundedly by extracting the extended warranty
  card and the coverage arithmetic.

**Non-Goals:**

- Refactoring item save orchestration out of `AddEditItemScreen`. It stays where it is;
  this change delegates its new logic to a repository and a pure helper module rather than
  restructuring what is already there.
- Adding foreign keys, cascade deletes or indexes. The existing explicit-delete pattern is
  followed instead, for consistency.
- Fixing the `addMonths` month-overflow quirk. Extended warranty end dates inherit it
  deliberately (Decision 3).
- Screen tests. The repo has none; this change adds unit tests at the layers that already
  have them.

## Decisions

### Decision 1: Extended warranties get their own table

`extended_warranties(id, item_id, provider, duration_value, duration_unit, starts_on,
ends_on, cost, notes, sort_order, created_at, updated_at)`, created by **migration 8**.

Rejected: a JSON blob column on `warranty_items`. It would need no migration for later
field additions, but SQLite is the source of truth here and a JSON column cannot be
queried, ordered or joined; every read would have to parse and re-validate it, and the
"never store structured data opaquely" property the rest of the schema has would be lost
for the one table that most needs ordering.

Rejected: reusing `warranty_items` with a `parent_item_id`. It would make every existing
query — Home's list, filters, counts — have to remember to exclude child rows, and one
forgotten `WHERE parent_item_id IS NULL` would show extended warranties as items.

`sort_order` is dense from zero and reconciled on save, exactly like `invoice_images`.

### Decision 2: Duration is stored as a value plus a unit, not as months

The mockup enters duration as a number plus a `months`/`years` dropdown, and the form must
show back what the user typed — an item bought with "2 years" of extended cover should not
reopen reading "24 months". So both `duration_value` and `duration_unit` are stored, and
months are derived (`value * 12` for years) wherever arithmetic is needed.

Rejected: storing months only and inferring the unit on read (`months % 12 === 0 → years`).
It is lossy in the one direction users notice: an honest "12 months" would reopen as
"1 year". `formatWarrantyDuration` already makes that inference for *display* of the
manufacturer warranty, which is fine because that value genuinely is months; it is not fine
for a field the user typed.

### Decision 3: `ends_on` is derived at write time and stored

`ends_on = addMonths(starts_on, durationMonths)` minus one day, computed in the repository
on every insert and update, never accepted from a caller — the same contract `expiry_date`
already has, and for the same reason: a stored derived value that a caller can set is a
stored value that will eventually disagree with what it was derived from.

The minus-one-day makes the period inclusive of both endpoints and exactly the stated
length, so a period starting the day after the previous one ends tiles the timeline with
no gap and no overlap. It also matches the mockup, where a 24-month cover starting
30 Aug 2027 ends 29 Aug 2029.

Rejected: deriving `ends_on` on read instead of storing it. Reminders, the coverage end
date and the expiring-soon ordering all need it; deriving it in four places invites four
subtly different answers, and storing it lets a later query filter on it directly.

**Accepted quirk:** `addMonths` is reused as-is, so extended warranty end dates inherit its
UTC month-overflow behaviour (a period starting 31 Jan lasting 1 month ends 2 Mar, not
28 Feb). Introducing a second, "more correct" month-addition function would mean the
manufacturer warranty and the extended warranty compute end dates differently — a worse
outcome than one consistent quirk. This is called out in tasks so it is pinned by test
rather than discovered later.

### Decision 4: The coverage end date is derived on read, never stored

`WarrantyItem` gains `coverageEndDate: string`, computed by the repository mapper as the
maximum of `expiryDate` and every extended warranty's `endsOn`. `expiry_date` keeps its
current meaning and derivation untouched.

Rejected: overwriting `expiry_date` with the coverage end. It is the smallest diff — every
existing call site would just keep working — and it is the worst option: the manufacturer
valid-till date would be destroyed, the detail screen could no longer show it, and the
value would stop being derivable from `purchase_date` and `warranty_months`, breaking the
invariant that the whole domain rests on.

Rejected: a stored `coverage_end_date` column maintained on write. It would need updating
from three different code paths (item save, extended warranty save, extended warranty
delete) and would be wrong whenever one of them was missed. Deriving it in the mapper means
it is a pure function of rows that were just read, and cannot drift.

The five `getWarrantyStatus(item.expiryDate)` call sites move to `item.coverageEndDate`
together, in one task group, so there is no window where the app disagrees with itself.
`getWarrantyStatus` and `getDaysRemaining` keep their signatures — they take a date, and
what changes is which date they are given.

### Decision 5: Documents are scoped by a nullable `extended_warranty_id`, and no new kind is introduced

**Migration 9** adds nullable `extended_warranty_id` to `invoice_images`. NULL keeps its
existing meaning — a document belonging to the item itself — so every existing row is
already correct and no backfill runs.

A document's section is therefore `(scope, kind)`: the item's invoice section is
`(NULL, 'invoice')`, an extended warranty's invoice section is `(<ew id>, 'invoice')`.

Rejected: two new kind values, `extendedInvoice` and `extendedWarranty`. With several
extended warranties per item, kind alone cannot say *which* one a document belongs to, so
the scope column would be needed regardless — and then the kind values would be redundant
with it, and every `kind === 'invoice'` check in the codebase would need widening.

`item_id` stays populated on extended warranty documents even though it is implied by the
scope. It keeps `deleteItem`'s single `DELETE FROM invoice_images WHERE item_id = ?` correct
for every scope, and keeps the multi-item read used by Home a single query.

`MAX_DOCUMENTS_PER_KIND` keeps its name and value; what changes is the group it is counted
over, from `(item, kind)` to `(item, scope, kind)`.

`saveDocumentsForItem(itemId, kind, drafts)` becomes
`saveDocumentsForScope({ itemId, extendedWarrantyId, kind }, drafts)`. Passing a scope
object rather than a fourth positional argument keeps the two nullable-ish ids from being
transposable at a call site.

### Decision 6: Extended warranty ids are minted on the client when the row is added

A user can attach documents to an extended warranty that has never been saved. Rather than
inventing a placeholder key and rewriting document rows after the insert, the screen mints
the extended warranty's UUID the moment the user adds it, and document drafts reference it
immediately. Saving inserts a row with that id; the documents already point at it.

This mirrors the `isPersisted` flag the document drafts already carry, and it means the
save path is the same whether the extended warranty is new or existing.

### Decision 7: Reminders key on the coverage period, not the item

**Migration 9** also adds nullable `extended_warranty_id` to `notification_schedules`. NULL
means the manufacturer period, so every reminder scheduled before this change is
automatically adopted as a manufacturer-period reminder and is cancelled and rescheduled
with the rest instead of being orphaned.

Scheduling becomes: build the item's list of coverage periods — the manufacturer period
plus one per extended warranty — and run the existing 30/7/0-day planner over each period's
end date. The planner's "future triggers only" filter already handles periods that have
already ended, so a past extended warranty schedules nothing without a special case.

`hasExpiryDateChanged(previous, updated)` is replaced by a comparison of the item's
**coverage signature** — the ordered list of `(periodId, endDate)` pairs. Reschedule when
the signature changes; skip when it has not. The old function answered a question that is
now too narrow: adding an extended warranty changes nothing about `expiryDate`, and under
the old check would silently schedule no reminders at all for the new period.

Rejected: rescheduling unconditionally on every save. Simpler, and it would work, but it
cancels and re-creates every OS notification for the item on a pure rename — churn against
an API this app has no way to reconcile if a cancel silently fails.

Reminder content is unchanged: same title, same body, same `{ itemId }` payload, so the
existing tap-to-open-item listener needs no change and a reminder for an extended period is
indistinguishable to the OS from any other.

**Accepted:** two periods that end on the same date produce two identical reminders. This is
degenerate input (back-to-back cover of zero length), and de-duplicating would mean the
schedules table no longer has a row per period, which is what makes cancellation reliable.

### Decision 8: The backup format version stays 1, with extended warranties nested

Each exported item gains an optional `extendedWarranties: [...]` array, and **each extended
warranty's documents are nested inside its own entry** rather than appearing in the item's
flat `invoiceImages` list.

The nesting is the point. `separate-warranty-documents` set the precedent that an older
build reading a newer archive should degrade rather than reject, and bumping to version 2
would make old builds throw `unsupportedVersion` and import nothing at all. But if extended
warranty documents sat in the item's flat list, an old build — which ignores the unknown
scope field — would import them into the item's *own* invoice and warranty sections, silently
mixing an extended warranty's paperwork into the manufacturer's. Nesting means an old build
simply does not see them: the item imports with its own documents intact and its extended
cover absent, which is a clean partial import rather than a corrupt one.

The archive's file layout is unchanged; extended warranty images are written under the same
`invoices/` prefix as every other document.

### Decision 9: New code lands in a repository plus a pure helper, not in the screen

- `src/db/extendedWarrantyRepository.ts` — reads, and a
  `saveExtendedWarrantiesForItem(itemId, drafts)` that reconciles the set the same way
  documents are reconciled: delete what is gone, update what stayed, insert what is new,
  renumber densely, and return the removed ids so the caller can clean up their documents
  and files.
- `src/utils/coverage.ts` — pure, unit-testable, no I/O: derive months from a
  value/unit pair, derive an end date, compute an item's coverage end date, compute the
  default start date for the next extended warranty, and build the coverage signature used
  to decide whether to reschedule.
- `src/components/ExtendedWarrantyCard.tsx` — the per-warranty card from the mockup,
  presentational, driven by props.

`AddEditItemScreen` keeps its orchestration role and calls into these. This adds one
repository and one utils module to layers that already exist, per CLAUDE.md's architecture
rules, and keeps the screen's growth to wiring rather than logic.

### Decision 10: A period's state is derived from its own dates, and `upcoming` widens the existing union

`getPeriodStatus(startsOn, endsOn, now)` lands in `utils/coverage.ts` and returns
`upcoming | active | expiring | expired`. `WarrantyStatus` in `components/StatusBadge.tsx`
widens with `upcoming`, gaining a label key and a colour pair; the manufacturer period is
passed the purchase date and the expiry date, an extended warranty its own two dates.

Widening the shared union rather than inventing a parallel `PeriodStatus` type is the point:
the chips are visually the same component in the same three existing colours plus one, and
two near-identical unions would guarantee that a future state is added to one and not the
other. The compiler flags the two exhaustive maps in `StatusBadge`, which is the whole
migration.

`getWarrantyStatus(expiryDate)` is untouched and keeps its three-value answer. It is asked a
different question — "how is this item doing" — and items have no start date to be upcoming
from. A period status is not a substitute for it, and the item badge keeps using it against
`coverageEndDate` (Decision 4).

The countdown flips with the state: an upcoming period counts up to its start, everything
else counts down to its end. That is a second formatter alongside `formatDaysRemaining`,
sharing `getDaysRemaining`'s arithmetic rather than reimplementing it.

Rejected: treating an upcoming period as active. It is the smallest change and it lies —
the mockup's whole reason for the `Upcoming` chip is that cover bought today but starting in
a year is not protecting anything yet, and telling the user it is "Active" would be worse
than showing no chip at all.

### Decision 11: The detail screen's add controls navigate; they do not save

Each add control on the detail screen navigates to `AddEditItem` with the section to focus.
`RootStackParamList`'s `AddEditItem` entry gains an optional focus parameter naming the
section — the item's invoice or warranty documents, a specific extended warranty's documents
by id, or the extended warranty section itself for "Add Extended Warranty". Absent, the
editor opens as it does today.

Rejected: attaching documents directly from the detail screen. It is what the mockup
literally depicts and the user confirmed against it. The edit screen's attach flow is built
on drafts reconciled in a single `handleSave` — the source-chooser, the permission prompt,
the per-scope cap, the orphaned-file cleanup and the reminder rescheduling all hang off it.
Reproducing that on a second screen means either a second save path that has to stay in step
with the first, or hoisting the whole draft model into a store — a refactor this change
explicitly does not take on (Non-Goals). Navigation gets the mockup's affordance with one
save path.

**Consequence to get right:** the editor must be reachable at a section, and returning must
show what was saved. The screen already reloads the item on focus, so the return path needs
nothing new.

### Decision 12: One view model for every period, so the manufacturer entry is not a special case

The timeline is fed a list of `CoveragePeriod` values — a state, a date range, a countdown,
a title, an optional provider/duration/cost trio, and the document sections belonging to it.
The manufacturer warranty is mapped into that shape exactly like an extended warranty; the
only difference is that its trio is absent and its title differs.

A single `CoveragePeriodCard` renders one entry and a `CoverageTimeline` draws the rail
between them. Both are presentational and prop-driven, like the rest of `components/`.

Rejected: rendering the manufacturer block inline in the screen and mapping only the
extended warranties. It is the shape the data arrives in, and it is how the current screen is
written — but it puts the two kinds of entry in two places that then drift, which is exactly
the divergence the mockup's uniform treatment of them is designed to avoid. Deriving the
list in one place also means the ordering requirement is satisfied by construction.

## Risks / Trade-offs

- **Status divergence** — five call sites read `item.expiryDate` for status today. If some
  move to `coverageEndDate` and some do not, an item reads active on Home and expired on
  Detail. → All five move in one task group (tasks 6.x), the type change makes the compiler
  enumerate them, and `itemFilters` and `notificationsStore` get tests pinning that an item
  with only extended cover is treated as live.

- **Orphaned OS notifications** — nothing reconciles `notification_schedules` against the
  OS, so a cancel that silently fails leaves a notification the app can no longer reach.
  This change multiplies the number of scheduled notifications per item. → Existing
  behaviour, not made worse per-notification; the coverage-signature check keeps
  cancel/reschedule cycles to occasions when the cover actually moved, rather than every
  save. Not fixed here.

- **Android scheduled-notification limits** — an item with many extended warranties
  schedules three reminders per period. A library with many such items could approach
  platform limits. → Realistic counts are small (one or two extended warranties per item,
  and only future triggers are scheduled). Called out rather than mitigated; a global
  reminder budget would be its own change.

- **`AddEditItemScreen` grows again** — it is already the largest file in the repo and this
  is the largest feature added to it. → The card is extracted to a component and all
  arithmetic to `utils/coverage.ts`; what lands in the screen is state wiring. Accepted,
  and the screen remains untested like every other screen.

- **The mockups show PDF affordances this change does not build** — PDF badges, filenames
  and file sizes appear on the document tiles in both reference images. → Confirmed out of
  scope with the user twice; the sections reproduce the mockups' layout, spacing and
  controls with the existing image tiles, exactly as the invoice and manufacturer warranty
  sections already do. The divergence is recorded here so the next reader does not "fix" it.

- **The two mockups' date arithmetic disagrees with each other** — the Add/Edit mockup draws
  a 24-month cover as 30 Aug 2027 → 29 Aug 2029 (start plus duration minus a day); the
  detail mockup draws one as 28 Aug 2027 → 29 Aug 2029 (start plus duration plus a day), and
  its own purchase date and manufacturer range disagree by two days as well. → Their sample
  dates are illustrative, not normative. Decision 3's rule stands and matches the detail
  mockup's *start* rule exactly (28 Aug 2027 is the day after the manufacturer warranty's
  27 Aug 2027). Do not reverse-engineer the arithmetic from either image.

- **An extended warranty's documents sit inside its own card, not a card of their own** —
  the Add/Edit mockup draws the entry's fields and its two document sections as two
  separate tiles. That reads fine for the single extended warranty the mockup shows, and
  badly for several: the second tile detaches from the entry it belongs to and there is
  nothing to say which cover's paperwork it holds. One card per extended warranty, with a
  divider before the document sections. Changed on user feedback after the first build.

- **Two mockup elements are deliberately not reproduced on the detail screen** — the details
  card in the mockup drops the **Warranty Period** row (the duration now appears against the
  period it belongs to, which is better placement, so this is followed) and shows no
  **Notes** section (the sample item has none). → Notes are kept but rendered only when the
  item has some, rather than deleting a field users can fill in and then cannot see. Both
  are recorded here rather than left to be rediscovered as bugs.

- **`ItemDetailScreen` is effectively rewritten** — the summary, details card, document
  sections and action bar all change, and the timeline is new. It is one of the two untested
  screens in the repo, so the safety net is the extracted, tested arithmetic beneath it. →
  All date and state derivation lives in `utils/coverage.ts` with tests; what lands in the
  screen is layout and prop-passing. Accepted.

- **`item-documents` is not yet in `openspec/specs/`** — its defining change is merged but
  unarchived, so this change's delta is written against a spec that only exists inside
  another change directory. → Archive or sync `separate-warranty-documents` before this
  change is archived, or its MODIFIED requirements will have nothing to merge onto.

## Migration Plan

Two additive migrations, applied in order by the existing runner, each inside its own
transaction:

1. **Migration 8** — `CREATE TABLE IF NOT EXISTS extended_warranties (...)`. No existing
   table is read or written. Every existing item has zero rows here, which is exactly the
   "no extended warranty" state, so no backfill is needed or run.
2. **Migration 9** — `ALTER TABLE invoice_images ADD COLUMN extended_warranty_id TEXT` and
   `ALTER TABLE notification_schedules ADD COLUMN extended_warranty_id TEXT`. Both nullable
   with no default, and NULL is defined to mean what those rows already mean — item-scoped
   document, manufacturer-period reminder. Again no backfill.

Nothing is dropped, renamed or rewritten, so an upgraded install is correct on first read:
every item's `coverageEndDate` equals its `expiryDate`, every document stays in the section
it was in, and every scheduled reminder is adopted as a manufacturer-period reminder.

**Rollback**: reinstalling an older build over this schema is safe by construction — the
older code selects named columns it knows about, ignores `extended_warranty_id`, and never
reads `extended_warranties`. The extended cover becomes invisible rather than corrupting;
re-upgrading surfaces it again. The one asymmetry is reminders: an older build would
reschedule from `expiry_date` only, so extended-period reminders would be cancelled and not
replaced. Acceptable — reminders are rebuilt from the database on the next save.

## Open Questions

Both of the questions this section originally carried are now answered by the detail-screen
mockup: the "how it works" explainer stays on the edit screen only, and the detail screen
does present the periods as a timeline — a vertical list with a connecting rail, which the
mockup draws, rather than a proportional time axis, which it does not.

- Whether the per-tile overflow menu on the detail screen's document tiles should offer
  anything beyond viewing the document and jumping to the editor. With the screen read-only
  (Decision 11) those are the only two actions available to it; a richer menu would need
  Decision 11 revisited first, which is a separate change rather than a detail of this one.
