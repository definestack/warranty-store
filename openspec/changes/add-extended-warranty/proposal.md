## Why

An item's coverage does not end when the manufacturer warranty does. Users routinely buy
an extended warranty — from the retailer, the brand, or a third-party provider — and today
the app has nowhere to record it. The provider, what it cost, when it starts and ends, and
its paperwork all end up crammed into the item's notes or into the manufacturer warranty's
document list, where the app cannot reason about them.

The consequence is worse than untidy data: an item whose extended warranty runs for
another two years is shown as **expired** on Home, is filtered out of reminders, and stops
notifying the user entirely — exactly when the extended cover is the only cover left and
the user most needs to be told it is about to lapse.

The previous change (`separate-warranty-documents`) split the document bucket by kind
specifically to make room for this, and left the invoice/warranty split in place. This
change fills that room.

## What Changes

- An item can hold **any number of extended warranties**, ordered, each independent of the
  others. Zero is the normal case and stays the default.
- Each extended warranty records: **provider/company** (optional), **duration** as a value
  plus a unit of months or years, **starts on**, **ends on**, **cost** (optional) and
  **notes** (optional).
- **Starts on is editable and defaults to the day after the previous cover ends** — the
  manufacturer expiry date for the first extended warranty, the preceding extended
  warranty's end date for each one after it. **Ends on is read-only and derived** from the
  start date and the duration, mirroring how the manufacturer warranty's valid-till date
  already works.
- Each extended warranty carries **its own two document sections** — its invoice/bill and
  its certificate/policy/terms — reusing the existing invoice and warranty document kinds,
  now scoped to the extended warranty rather than to the item.
- **BREAKING (internal)**: an item's warranty **status and days-remaining now derive from
  its furthest coverage end date**, not from the manufacturer expiry date. An item with a
  live extended warranty reads as active on Home, in the status badge, in the expiring-soon
  list, and in every place that currently filters on expiry. The manufacturer expiry date
  itself is unchanged, still derived from purchase date and warranty months, and is still
  shown in its own right on the detail screen.
- **BREAKING (internal)**: **reminders are scheduled per coverage period**, not per item.
  The manufacturer warranty and every extended warranty each get their own 30-day, 7-day
  and on-expiry reminders. `notification_schedules` gains a nullable reference to the
  extended warranty a schedule belongs to; existing rows read as manufacturer-period rows.
- The **Add/Edit screen** gains the extended warranty section from the mockup: an optional
  toggle, a collapsible card per extended warranty, an add-another control, and a
  "how it works" explainer.
- The **Item Detail screen is redesigned** around coverage, per its own mockup:
  - The summary header reads **"Covered till &lt;date&gt; · N days left"**, following the
    item's furthest coverage end rather than its manufacturer expiry.
  - The details card gains a **Category** row and splits the old warranty valid-till row
    into **Original Warranty Valid Till** and **Extended Warranty Valid Till**, the latter
    shown only when there is extended cover. The **Warranty Period** row is dropped; the
    duration now appears against the period it belongs to.
  - A dedicated **Original Bills / Invoices** section holds the item's purchase paperwork.
  - A **Warranty Coverage** timeline lists the manufacturer period first, then each
    extended warranty in its stored order. Every entry carries a state chip, its date
    range, a countdown line, and its own document sections; extended entries additionally
    show provider, duration and cost.
- Cover periods gain a **state of their own**, distinct from the item's: **upcoming**,
  active, expiring soon or expired. `Upcoming` is a new state — a period whose start date
  has not arrived — and its countdown counts *up to the start* ("Starts in 364 days")
  rather than down to the end. The item-level badge is unaffected and still reflects the
  item's overall coverage.
- The detail screen's **add controls are shortcuts, not a second save path**. "Add
  Invoice", "Add More" and "Add Extended Warranty" open the Add/Edit screen at the matching
  section. The detail screen stays read-only and every write still goes through one save.
- **BREAKING (internal)**: the `AddEditItem` route gains an optional section-focus
  parameter so those shortcuts can land on the right part of the form. Existing navigation
  to the route without it is unchanged.
- **Backup and restore** carry extended warranties and their documents. The backup format
  version stays **1**: extended warranties are recorded as an optional per-item list with
  their documents nested inside them, so an older build importing a newer archive imports
  the item and silently omits the extended cover rather than rejecting the archive or
  misfiling its documents into the item's own sections.

### Non-goals

Explicitly out of scope, including things visible in the reference mockup:

- **PDF or non-image attachments.** Extended warranty documents are images only, exactly
  like the invoice and manufacturer warranty sections that already ship. The PDF badges,
  original filenames and file sizes drawn on the document tiles in **both** mockups are not
  reproduced — tiles stay thumbnail-only. Confirmed with the user twice.
- **Editing from the item detail screen.** Its add controls navigate to the editor; no
  document is attached, replaced, removed or reordered, and no extended warranty is
  created, without going through the Add/Edit screen's existing draft-and-save path.
- **A coverage bar or graphical timeline.** The Warranty Coverage section is a vertical
  list with a connecting rail, as drawn — not a proportional time axis.
- **Warning the user about gaps or overlaps between coverage periods.** Dates are the
  user's to set; the app derives the end date and otherwise does not police the timeline.
- **A separate "extended warranty expiring" reminder wording, channel or icon.** Reminders
  reuse the existing content and still deep-link to the item.
- **Renewing, transferring or claiming against an extended warranty**, or any provider
  contact details beyond the free-text provider name.
- **Currency selection.** Cost uses the same single currency presentation as the item's
  purchase price.
- **A Reminders screen** listing the newly per-period schedules. That tab is still a stub.

## Capabilities

### New Capabilities

- `extended-warranty`: The extended warranty cover a user records against an item — how
  many an item may hold, what each one records, how its end date is derived from its start
  and duration, how the set of periods determines the item's overall coverage end and
  therefore its status, how reminders are scheduled for each period, and how the periods
  survive editing, deletion, export and import.

### Modified Capabilities

- `item-documents`: Documents gain a **scope** in addition to their kind. A document
  belongs either to the item itself (as today) or to one of the item's extended
  warranties, and the per-section limit of 10 is counted per kind **per scope** rather
  than per kind per item. Attaching, replacing, removing, reordering, storage cleanup and
  export/import all become scope-aware. The two existing kinds are unchanged and no new
  kind is introduced.

  Note: `item-documents` is defined by the `separate-warranty-documents` change, which is
  merged but not yet archived, so its spec is not yet under `openspec/specs/`. This
  change's delta is written against it and assumes it lands first.

## Impact

**Database** — two additive migrations, no drops and no rewrites:

- **8** creates `extended_warranties` (id, item_id, provider, duration_value,
  duration_unit, starts_on, ends_on, cost, notes, sort_order, created_at, updated_at).
- **9** adds a nullable `extended_warranty_id` to both `invoice_images` and
  `notification_schedules`. NULL keeps its existing meaning on both tables: a document
  belonging to the item itself, and a reminder for the manufacturer period. Every existing
  row is therefore already correct with no backfill.

Following the precedent set by the retained `invoice_images` table name, the table and the
`documentDirectory/invoices/` storage directory keep their names; the row's scope carries
the meaning.

**Types** — `WarrantyItem` gains `extendedWarranties: ExtendedWarranty[]` and a derived
`coverageEndDate`; `ItemDocument` gains an optional `extendedWarrantyId`;
`NotificationSchedule` gains the same; `WarrantyStatus` widens with `upcoming`; the
`AddEditItem` route params gain an optional section to focus. All consumers are in this
repository.

**Code** — `src/db/{schema,migrations,warrantyRepository,invoiceImagesRepository,
notificationSchedulesRepository}.ts` plus a new `extendedWarrantyRepository.ts`;
`src/services/{notificationService,backupService,restoreService}.ts`;
`src/store/{itemsStore,notificationsStore}.ts`;
`src/screens/{AddEditItemScreen,ItemDetailScreen,HomeScreen}.tsx`;
`src/components/{StatusBadge,DetailRow}.tsx` plus new extended warranty and coverage
timeline components; `src/types/navigation.ts`;
`src/utils/{date,itemFilters,validation,documents}.ts`; all four locales in
`src/i18n/locales/`.

**Widening `WarrantyStatus`** — adding `upcoming` makes every exhaustive map over the union
incomplete until it is extended. That is the compiler doing the work: `StatusBadge`'s label
and colour maps are the only two, and both are in this change's scope.

**Highest-risk area** — the status move. `getWarrantyStatus` keeps its signature and its
30-day threshold; what changes is the date fed to it. Every call site must move to
`coverageEndDate` together, or an item will read as active in one place and expired in
another. `coverageEndDate` is derived in the repository mapper rather than stored, so it
cannot drift from the periods it summarises.

**Second-highest** — reminder rescheduling. Rescheduling currently triggers only when the
manufacturer expiry date changes; it must now trigger whenever the set of coverage period
end dates changes at all, including when an extended warranty is added or removed without
the manufacturer expiry moving.

**Not affected** — `expiry_date` and its derivation, `addMonths`, the categories list,
item photos, the theme/locale settings, and the backup archive's file layout.

**Dependencies** — none added. The date picker, image pipeline and document viewer already
in use cover everything this needs.

**Design reference** — two mockups govern this change and both must be saved to
`docs/design/` before implementation begins, per `.claude/rules/design-reference.md`: the
extended warranty section of the Add/Edit screen, and the redesigned Item Detail screen.

Their sample dates disagree with each other on end-date arithmetic and are treated as
illustrative, not normative; the rule is fixed in design.md — Decision 3.
