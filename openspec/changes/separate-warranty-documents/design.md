## Context

See proposal.md — Why. What shapes the approach below is the current storage model:
a single flat attachment list per item, with no discriminator, ordered by one
per-item sequence, stored in one directory, and exported into one archive folder.

Three properties of the existing code drive the decisions:

1. **Nothing enumerates the storage directories.** `readDirectoryAsync` appears nowhere
   in the codebase. Every file is reached through the URI stored on its row, and the
   backup packer names archive entries from each document's id, never from the on-disk
   filename. The per-kind directory separation used by item photos guards a directory
   listing that does not exist.
2. **Expiry is derived, always.** The valid-till date is recomputed from purchase date and
   warranty months on every write and is never supplied by a caller. Moving the warranty
   fields into a new section must not change that.
3. **Screens are the untested layer.** No screen or component tests exist, and item
   create/update orchestration lives in the 936-line `AddEditItemScreen`. Any genuinely
   new logic therefore belongs below the screen, where it can be tested.

## Goals / Non-Goals

**Goals:**

- One additive migration, no data loss, and a working downgrade path.
- The new ordering and limit logic testable without a screen test.
- Room for a third document kind without a second migration of the same shape.

**Non-Goals:**

- Restructuring how `AddEditItemScreen` orchestrates saves. The screen's existing
  structure is accepted as-is; handlers are parameterised by kind, not rewritten.
- Modelling warranties as their own entity. See Decision 1.
- Anything listed in proposal.md — Non-goals.

## Decisions

### 1. A kind discriminator on the existing document rows, not a warranty entity

**Chosen:** add `kind TEXT NOT NULL DEFAULT 'invoice'` to the existing document table. The
manufacturer warranty's months and expiry stay on the item where they already are.

**Alternative — model warranties as rows** (`warranties(item_id, type, months, expiry)`
with documents belonging to a warranty). This is the textbook shape and it is the right
answer *if* extended warranties can ever stack, or if reminders become per-warranty. It
was rejected for now because every item has exactly one manufacturer warranty — it is 1:1
with the item and does not need its own row — while the item's expiry date is read by the
status calculation, the status badge, item filters, reminder scheduling and the backup
format. Repointing all of those is the entire domain core, for a change whose scope is a
document bucket. It also forces an immediate product answer this change does not need:
which warranty's expiry the badge should show.

**Consequence:** when extended warranty arrives it adds a third kind value and its own
fields on the item. If stacking extended warranties is ever required, the entity model
returns as its own change — this decision does not block it, it defers it.

### 2. One shared storage directory, retaining the invoice-era names

**Chosen:** both kinds continue to be written to `documentDirectory/invoices/` with the
`invoice-<uuid>.jpg` prefix, and the table keeps its name. The row's kind carries the
meaning; the names are legacy.

**Alternative — a `warranties/` directory**, following the precedent set by item photos,
whose own comment cites keeping a listing unambiguous. Rejected on Context fact 1: that
listing does not exist, so a per-kind directory buys nothing operationally — no code reads
the prefix, enumerates the directory, or derives a document's kind from where its file
sits. It would only add a second path and a second prefix to keep straight.

This decision originally also rested on making reclassification a single atomic write.
Reclassification was later dropped (see Decision 6), so that argument no longer applies;
the decision stands on Context fact 1 alone, which is the stronger half of it anyway.

The repository already has precedent for retaining a misnamed identifier rather than
churning it: `warranty_items.invoice_uri` is kept as a dead legacy column.

### 3. Two pre-grouped lists on the item, not one list plus a filter

**Chosen:** the item exposes its invoice documents and its warranty documents as two
separate ordered lists, grouped once in the repository mapper.

**Alternative — a single documents list carrying kind**, filtered by each consumer.
Rejected because the kinds are a closed set of three, forever, and runtime filtering is
the shape for open-ended kinds. Pre-grouping also makes per-kind ordering self-evident at
the type level rather than an invariant each caller has to remember. Both options rename
the existing field, so neither is cheaper at the call sites.

### 4. Ordering is per kind

Each kind's sequence is independent and dense, starting at the first position, and
reconciling one kind never reads or rewrites the other's rows. That scoping is the change's
only genuinely new logic, so it lives in the repository — see Context fact 3 — and is
written test-first.

### 5. The backup format version is not bumped

**Chosen:** keep the format version at 1, add the kind to each document entry, and leave
the archive layout untouched. Document ids are UUIDs, so both kinds coexist in the one
archive folder without collision. On import, a document entry with no kind is treated as
an invoice, which is what makes pre-split archives import correctly.

**Alternative — bump the format version.** The importer rejects unknown versions outright,
so an older build handed a newer archive would refuse the entire file rather than the one
field it does not understand. For an offline app where the user owns the archive and may
restore onto an older build, degrading — every document still imported, just all under
Invoice — beats refusing. The trade-off is that the degradation is silent.

## Risks / Trade-offs

- **Documents attached before the split all land under Invoice.** The rows are genuinely
  indistinguishable — nothing recorded which was which — so no smarter backfill is
  possible. → Accepted: the app has not shipped, so no such documents exist outside
  development installs. See Decision 6.

- **An older build restoring a newer archive silently merges the kinds.** → Bounded:
  import is additive and skips ids that already exist, so nothing is overwritten or lost,
  and every document is still imported rather than dropped. Accepted in Decision 5.

- **The shared directory means the stored filename no longer describes the file.** → No
  code reads the prefix or lists the directory, per Context fact 1. Introducing a second
  prefix would leave both prefixes in use forever, which is worse than one
  honest-if-stale convention. Recorded here so the next reader does not infer meaning
  from the name.

- **The per-kind cap raises the practical ceiling from 10 to 20 images per item.** →
  Images are already compressed to a 1600px maximum dimension on save, and the ceiling is
  per item, not global. Accepted.

- **Moving the warranty fields into a new card touches the expiry invariant's UI.** The
  reference mockup renders valid-till with a calendar affordance matching the editable
  date row above it. Implementing that literally would let a caller supply an expiry date
  and silently break the status badge, filters and reminder scheduling. → Valid-till is
  specified as read-only and derived, and the mockup's affordance is deliberately not
  reproduced. Flagged here because the UI rules make the mockup the source of truth.

- **The screen's attach, replace, remove and reorder handlers assume a single list.** →
  Parameterise by kind rather than duplicating the handler set; duplication is how the two
  sections drift. The screen stays untested, so the reconcile and ordering logic it calls
  must be complete and tested underneath it.

### 6. No reclassification between sections

**Chosen:** a document's kind is fixed when it is attached. Correcting a misfiled document
means removing it and attaching it again in the right section.

This was originally in scope, and the data layer for it was built and tested before being
removed. Its entire justification was recovery: migration 7 files every pre-existing
document under Invoice, and for a document captured with the camera the app's copy is the
only copy, so delete-and-re-add would destroy the image rather than move it.

That case depends on documents existing before the split. The app has not shipped, so
outside development installs there are none — the recovery path has nothing to recover.
What remains is a user attaching to the wrong section by mistake, which they notice
immediately with the document still in hand, making re-capture cheap.

**Consequence:** if reclassification is ever wanted — most likely when extended warranty
adds a third kind and misfiling gets easier — it returns as its own change. It needs a
kind-and-order update that appends to the destination tail, closes the source gap, and is
refused when the destination is full, plus an affordance on a thumbnail tile that already
carries four controls. Decision 2's shared directory keeps that a single atomic write.

## Migration Plan

Migration 7 is a single additive `ALTER TABLE ... ADD COLUMN` with a default, applied in
its own transaction by the existing runner. Existing rows take the invoice value from the
default; no backfill statement is required and no user table is dropped or rewritten.

**Rollback:** no down-migration is needed. The column is additive and the previous build's
row mapper reads named fields, so it ignores the unknown column and shows every document
in the single invoice list, exactly as before. The schema version row is the only thing
left ahead, which the runner tolerates — it applies pending migrations by comparing
against the maximum applied version and never re-applies or reverses.
