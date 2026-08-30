## Why

Every warranty item today has a single attachment list — the "Invoice / Bill" section —
and users have been putting warranty cards, certificates and terms into it because there
is nowhere else for them to go. The rows in `invoice_images` carry no discriminator, so
the app cannot label, count, cap or display the two document types separately, and a
warranty card is indistinguishable from a receipt once saved.

This blocks the planned extended-warranty section, which needs its own documents to hang
off something. Splitting the bucket now — while there are only two kinds — is a single
additive migration; doing it after extended warranty exists is not.

## What Changes

- Item documents gain a **kind**: `invoice` or `warranty`. Existing rows become `invoice`.
- The edit and detail screens gain a second section, **Original Warranty (Manufacturer)**,
  holding the item's warranty documents.
- **Warranty months and the derived warranty-valid-till date move into that section**, so
  everything about the manufacturer warranty is grouped in one place. Valid-till stays
  read-only and derived — it does not become an editable date.
- Each section carries **its own cap of 10** documents, replacing the single shared
  per-item cap of 10.
- Ordering becomes **per section**: each list is numbered from 1 independently.
- Backup and restore carry the kind, so a restored library keeps the split. The backup
  format version is **not** bumped: an older build restoring a newer archive imports every
  document as an invoice rather than rejecting the archive outright.

### Non-goals

Explicitly out of scope, despite appearing in the reference mockup:

- **PDF or non-image attachments.** Documents remain images only.
- **Original filenames and file sizes** shown on the thumbnails.
- **The extended warranty section itself.** This change only makes room for it.
- **Moving a document between the two sections.** A document's kind is fixed when it is
  attached; correcting a misfile means removing and re-attaching it. See design.md —
  Decision 6.
- **Auto-fill / OCR** on the item photo card.
- **An editable warranty valid-till date.** Expiry stays derived from purchase date and
  warranty months on every write.

## Capabilities

### New Capabilities

- `item-documents`: The documents a user attaches to a warranty item — the two kinds
  (invoice and warranty) and what distinguishes them, attaching, replacing, removing and
  reordering them, the per-kind limit, where each kind is displayed, and how the stored
  files and the kind behave across saving, deleting, exporting and importing. Supersedes the previously unspecified invoice-attachment behaviour.

### Modified Capabilities

None. `item-photo` covers the item's own photo only and explicitly excludes attached
documents; `settings` covers which backup controls are offered, not the archive format.

## Impact

**Database** — additive migration 7 adds `kind TEXT NOT NULL DEFAULT 'invoice'` to
`invoice_images`. The table name, the `documentDirectory/invoices/` storage directory and
the `invoice-<uuid>.jpg` filename prefix are all retained despite now covering both kinds,
following the precedent already set by the retained `warranty_items.invoice_uri` column:
the row carries the meaning, not the name. Nothing enumerates those directories, so a
per-kind split would buy nothing operationally.

**Types** — `WarrantyItem.invoiceImages` is replaced by two pre-grouped lists. This is an
internal shape change with no external consumers; every call site is in this repository.

**Code** — `src/db/{schema,migrations,invoiceImagesRepository,warrantyRepository}.ts`,
`src/services/{fileService,imageService,backupService,restoreService}.ts`,
`src/store/itemsStore.ts`, `src/screens/{AddEditItemScreen,ItemDetailScreen}.tsx`,
`src/components/InvoiceImageViewer.tsx`, and all four locales in `src/i18n/locales/`.

**Not affected** — `expiry_date` derivation, `getWarrantyStatus`, notification scheduling,
`notification_schedules`, item filters and the status badge are all untouched. This change
does not reach the domain core.

**Dependencies** — none added.
