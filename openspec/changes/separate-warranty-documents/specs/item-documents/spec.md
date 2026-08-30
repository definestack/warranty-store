## Purpose

Defines the documents a user attaches to a warranty item — the two kinds they can be
(the purchase invoice or bill, and the manufacturer warranty paperwork), how each kind is
attached, replaced, removed and reordered, how many of each an item may hold, where each
kind is displayed, and how a document's kind behaves across saving, deleting, exporting,
importing and upgrading. This capability covers attached documents
only, not the item's own photo.

## ADDED Requirements

### Requirement: Every attached document belongs to exactly one kind

Every document attached to an item SHALL carry exactly one kind: either **invoice** (the
purchase bill or receipt) or **warranty** (the manufacturer warranty card, certificate or
terms). A document SHALL NOT belong to both kinds and SHALL NOT be kindless.

A document's kind SHALL persist across app restarts, and the item SHALL still present each
document under the same kind when it is next opened.

Both kinds SHALL be optional and independent. An item with no documents of either kind, or
with documents of only one kind, SHALL be fully valid and SHALL be creatable, editable and
savable. Documents SHALL NOT participate in validation: their absence SHALL never block
saving, and no field SHALL become required because a document was or was not attached.

#### Scenario: An item is saved with no documents at all

- **WHEN** the user fills in a valid item and saves it without attaching any document
- **THEN** the item is saved successfully
- **AND** both document sections are shown as empty when the item is reopened

#### Scenario: An item is saved with only warranty documents

- **WHEN** the user attaches only warranty documents to an item and saves it
- **THEN** the item is saved successfully
- **AND** those documents are presented under the warranty kind, with the invoice section
  empty

#### Scenario: A document's kind survives a restart

- **WHEN** the user attaches documents to both kinds, saves the item, and later reopens
  the app
- **THEN** each document is still presented under the kind it was attached to

### Requirement: The two kinds are presented as separate sections with separate limits

The item edit screen and the item detail screen SHALL present the two kinds as two
distinct, separately labelled sections. The invoice section SHALL be labelled as the
purchase invoice or bill. The warranty section SHALL be labelled as the original
manufacturer warranty.

Each section SHALL hold at most **10** documents, counted independently of the other
section. An item MAY therefore hold up to 10 invoice documents and up to 10 warranty
documents at the same time.

When a section is already at its limit, the app SHALL refuse to add more to that section,
SHALL tell the user the per-section limit has been reached, and SHALL leave both sections
unchanged. Reaching the limit in one section SHALL NOT prevent adding documents to the
other.

The documents within each section SHALL be ordered, and each section's ordering SHALL be
independent: each section SHALL number its documents from the first position with no gaps,
regardless of how many documents the other section holds.

#### Scenario: Each section is labelled and populated separately

- **WHEN** the user opens an item that has documents of both kinds
- **THEN** the invoice documents appear under the invoice section
- **AND** the warranty documents appear under the manufacturer warranty section
- **AND** neither section shows the other's documents

#### Scenario: One section reaches its limit

- **WHEN** the invoice section already holds 10 documents and the user tries to add
  another to it
- **THEN** the app declines and states the per-section limit
- **AND** the invoice section still holds exactly those 10 documents

#### Scenario: A full section does not block the other

- **WHEN** the invoice section already holds 10 documents
- **THEN** the user can still add documents to the warranty section, up to its own limit
  of 10

#### Scenario: Each section is numbered from the start

- **WHEN** an item holds 3 invoice documents and 2 warranty documents
- **THEN** the invoice documents are ordered first through third
- **AND** the warranty documents are ordered first and second

### Requirement: The user can attach documents to a chosen section

Each section SHALL offer its own control for adding documents to that section. Activating
it SHALL offer a choice of two sources: capturing a new image with the camera, or choosing
existing images from the photo library. The user SHALL be able to dismiss that choice
without changing either section.

A document added through a section's own control SHALL be added to that section and SHALL
NOT be added to the other.

If the permission required by the chosen source has not been granted, the app SHALL
request it. If permission is refused, the app SHALL explain which permission is needed,
SHALL offer to open the system settings, SHALL leave both sections unchanged, and SHALL
NOT fail the save.

If the user cancels the camera or library picker without selecting anything, both sections
SHALL be left unchanged.

When the user selects more images than the target section has remaining capacity, the app
SHALL NOT exceed that section's limit.

#### Scenario: A document is added to the section it was started from

- **WHEN** the user activates the add control inside the manufacturer warranty section and
  selects an image
- **THEN** that image is shown as a warranty document
- **AND** the invoice section is unchanged

#### Scenario: A source chooser is offered per section

- **WHEN** the user activates a section's add control
- **THEN** the app offers capturing with the camera and choosing from the photo library
- **AND** dismissing the chooser leaves both sections as they were

#### Scenario: Permission for the chosen source is refused

- **WHEN** the user chooses a source and refuses the permission it requires
- **THEN** the app states which permission is needed and offers to open the system
  settings
- **AND** both sections are left unchanged

#### Scenario: The picker is cancelled

- **WHEN** the user opens the camera or library picker and cancels without selecting
- **THEN** both sections are left unchanged

#### Scenario: A multi-selection exceeds the remaining capacity

- **WHEN** a section already holds 8 documents and the user selects 5 images for it
- **THEN** the section ends up holding no more than 10 documents
- **AND** the app states the per-section limit has been reached

### Requirement: The user can replace, remove and reorder documents within a section

Within each section the user SHALL be able to replace an individual document with a newly
captured or chosen image, remove an individual document, and change a document's position
relative to the other documents in the same section.

All three actions SHALL apply only to the section they were performed in and SHALL leave
the other section's contents and ordering unchanged.

After a removal or a reorder, the affected section SHALL remain numbered from its first
position with no gaps.

#### Scenario: A document is replaced in place

- **WHEN** the user replaces the second warranty document with a new image
- **THEN** the warranty section still holds the same number of documents
- **AND** the new image occupies the second position
- **AND** the invoice section is unchanged

#### Scenario: A document is removed and the section closes the gap

- **WHEN** the user removes the first of three invoice documents
- **THEN** the invoice section holds the remaining two documents
- **AND** they are ordered first and second

#### Scenario: Reordering stays inside its section

- **WHEN** the user moves a warranty document from the second position to the first
- **THEN** the warranty documents are reordered accordingly
- **AND** the invoice documents keep their original order
### Requirement: The manufacturer warranty period and its documents are presented together

The warranty section SHALL present the item's manufacturer warranty as a single group: the
warranty period in months, the date the warranty is valid until, and the warranty
documents.

The warranty period in months SHALL remain editable and SHALL remain required, keeping its
existing validation.

The warranty valid-until date SHALL be presented as read-only and SHALL be derived from
the item's purchase date and warranty period. The app SHALL NOT offer any control that
sets the valid-until date directly, and the date SHALL NOT be settable independently of
the purchase date and warranty period. The app SHALL indicate that the date is calculated
rather than entered.

#### Scenario: The warranty period and documents are shown as one group

- **WHEN** the user opens an item for editing
- **THEN** the warranty period, the valid-until date and the warranty documents are
  presented together in the manufacturer warranty section

#### Scenario: The valid-until date follows the period

- **WHEN** the user changes the warranty period in months
- **THEN** the valid-until date shown updates to reflect the new period
- **AND** the item is saved with that derived date

#### Scenario: The valid-until date cannot be set directly

- **WHEN** the user views the manufacturer warranty section
- **THEN** no control is offered that would set the valid-until date on its own
- **AND** the date is presented as calculated from the purchase date and warranty period

### Requirement: Documents of both kinds are stored in app-private storage and not left behind

Every attached document SHALL be copied into app-private storage when it is attached, and
the app SHALL NOT depend on the location the image was originally selected from.

When a document is replaced, removed, or attached and then abandoned by leaving the edit
screen without saving, its stored image SHALL be discarded. Deleting an item SHALL discard
the stored images of all its documents, of both kinds.

A failure to store, discard or record an individual document SHALL be handled without
losing the item: the remaining documents and the item itself SHALL still be saved.

#### Scenario: The original source location is not relied on

- **WHEN** a document has been attached and saved
- **THEN** it is still displayed after the originally selected image is no longer
  available at its original location

#### Scenario: A replaced document's image is discarded

- **WHEN** the user replaces a document in either section and saves
- **THEN** the replaced image is no longer retained by the app

#### Scenario: Leaving without saving strands nothing

- **WHEN** the user attaches documents to either section and leaves the edit screen
  without saving
- **THEN** the newly attached images are not retained by the app
- **AND** the item's saved documents are unchanged

#### Scenario: Deleting an item discards both kinds

- **WHEN** the user deletes an item holding both invoice and warranty documents
- **THEN** the stored images for both kinds are discarded

#### Scenario: A document failure does not lose the item

- **WHEN** one document cannot be stored or recorded while the item is being saved
- **THEN** the item is still saved with its other documents
- **AND** the user is told the document could not be saved

### Requirement: A document's kind survives export and import

Exporting a backup SHALL record which section each document belongs to, and importing that
backup SHALL restore each document to the same section it was exported from.

Importing an archive that predates the split, or whose document entries do not state a
kind, SHALL treat every such document as an invoice document rather than rejecting the
archive or dropping the document. Importing SHALL NOT reject an archive solely because of
how document kinds are recorded.

A document whose image is missing from the archive or cannot be written SHALL be dropped
without failing the item, as with any other document.

#### Scenario: An exported split is restored intact

- **WHEN** an item with both invoice and warranty documents is exported and then imported
  into a library that does not already contain it
- **THEN** the imported item presents the same documents under the same sections as when
  it was exported

#### Scenario: A pre-split archive still imports

- **WHEN** the user imports a backup created before documents had sections
- **THEN** the archive is accepted
- **AND** every document in it is presented as an invoice document

#### Scenario: An unreadable document does not fail the import

- **WHEN** an archive is missing the image for one warranty document
- **THEN** the item is still imported with its remaining documents

### Requirement: Documents attached before the split remain available

Upgrading an installation SHALL preserve every document already attached to every item. No
document SHALL be lost, dropped or made unreachable by the introduction of document
sections.

Because documents attached before the split carry no record of which kind they were, every
pre-existing document SHALL be presented in the invoice section after the upgrade.

#### Scenario: Existing documents survive the upgrade

- **WHEN** an installation with existing items and attached documents is upgraded
- **THEN** every previously attached document is still present on its item
- **AND** each is presented in the invoice section
