## MODIFIED Requirements

### Requirement: Every attached document belongs to exactly one kind

Every document attached to an item SHALL carry exactly one kind: either **invoice** (the
purchase bill or receipt) or **warranty** (the warranty card, certificate or terms). A
document SHALL NOT belong to both kinds and SHALL NOT be kindless.

Every document SHALL additionally belong to exactly one **scope**: either the **item
itself**, or exactly one of the item's **extended warranties**. A document SHALL NOT belong
to two scopes and SHALL NOT be scopeless. A document's kind and its scope together
determine which section it is presented in, giving each item its own invoice and warranty
sections plus one invoice and one warranty section per extended warranty.

A document's kind and scope SHALL persist across app restarts, and the item SHALL still
present each document in the same section when it is next opened.

All sections SHALL be optional and independent. An item with no documents in any section,
or with documents in only some sections, SHALL be fully valid and SHALL be creatable,
editable and savable. Documents SHALL NOT participate in validation: their absence SHALL
never block saving, and no field SHALL become required because a document was or was not
attached.

#### Scenario: An item is saved with no documents at all

- **WHEN** the user fills in a valid item and saves it without attaching any document
- **THEN** the item is saved successfully
- **AND** every document section is shown as empty when the item is reopened

#### Scenario: An item is saved with only warranty documents

- **WHEN** the user attaches only warranty documents to an item and saves it
- **THEN** the item is saved successfully
- **AND** those documents are presented under the warranty kind, with the invoice section
  empty

#### Scenario: A document's kind survives a restart

- **WHEN** the user attaches documents to both kinds, saves the item, and later reopens
  the app
- **THEN** each document is still presented under the kind it was attached to

#### Scenario: A document's scope survives a restart

- **WHEN** the user attaches documents to the item's own sections and to an extended
  warranty's sections, saves, and later reopens the app
- **THEN** each document is still presented in the section it was attached to
- **AND** no document has moved between the item and the extended warranty

### Requirement: The two kinds are presented as separate sections with separate limits

The item edit screen and the item detail screen SHALL present each scope's two kinds as
distinct, separately labelled sections. The item's own invoice section SHALL be labelled as
the purchase invoice or bill, and its warranty section as the original manufacturer
warranty. Each extended warranty SHALL present its own invoice section and its own document
section, labelled as belonging to that extended warranty and shown within it, so it is
unambiguous which cover a document belongs to.

Each section SHALL hold at most **10** documents, counted independently of every other
section. An item MAY therefore hold up to 10 invoice documents and up to 10 warranty
documents of its own, plus up to 10 of each for every extended warranty it holds.

When a section is already at its limit, the app SHALL refuse to add more to that section,
SHALL tell the user the per-section limit has been reached, and SHALL leave every section
unchanged. Reaching the limit in one section SHALL NOT prevent adding documents to any
other.

The documents within each section SHALL be ordered, and each section's ordering SHALL be
independent: each section SHALL number its documents from the first position with no gaps,
regardless of how many documents any other section holds.

Every section SHALL be presented on both screens even when it holds no documents, with its
label and its add affordance reachable, so an empty section is visibly empty rather than
absent. A section SHALL NOT be hidden because it is empty.

#### Scenario: An empty section is still presented

- **WHEN** the user views an item that has no documents in one of its sections
- **THEN** that section is still shown, labelled and empty
- **AND** its add affordance is reachable

#### Scenario: Each section is labelled and populated separately

- **WHEN** the user opens an item that has documents of both kinds
- **THEN** the invoice documents appear under the invoice section
- **AND** the warranty documents appear under the manufacturer warranty section
- **AND** neither section shows the other's documents

#### Scenario: An extended warranty's sections are its own

- **WHEN** the user opens an item holding an extended warranty with documents of both kinds
- **THEN** those documents appear in that extended warranty's own invoice and document
  sections
- **AND** the item's own invoice and warranty sections do not show them

#### Scenario: One section reaches its limit

- **WHEN** the invoice section already holds 10 documents and the user tries to add
  another to it
- **THEN** the app declines and states the per-section limit
- **AND** the invoice section still holds exactly those 10 documents

#### Scenario: A full section does not block the other

- **WHEN** the item's own invoice section already holds 10 documents
- **THEN** the user can still add documents to the item's warranty section and to any
  extended warranty's sections, each up to its own limit of 10

#### Scenario: Each section is numbered from the start

- **WHEN** an item holds 3 invoice documents and 2 warranty documents
- **THEN** the invoice documents are ordered first through third
- **AND** the warranty documents are ordered first and second

### Requirement: The user can attach documents to a chosen section

Each section SHALL offer its own control for adding documents to that section. Activating
it SHALL offer a choice of two sources: capturing a new image with the camera, or choosing
existing images from the photo library. The user SHALL be able to dismiss that choice
without changing any section.

A document added through a section's own control SHALL be added to that section — that
kind, in that scope — and SHALL NOT be added to any other.

Where a section presents both a header control and an add tile at the end of its document
strip, the two SHALL NOT both be offered at once: the header control SHALL be shown only
while the section is empty, and SHALL NOT be shown once the section holds a document,
leaving the tile as the way to add more. A section SHALL always offer at least one active
way to add to it, up to its limit.

If the permission required by the chosen source has not been granted, the app SHALL
request it. If permission is refused, the app SHALL explain which permission is needed,
SHALL offer to open the system settings, SHALL leave every section unchanged, and SHALL
NOT fail the save.

If the user cancels the camera or library picker without selecting anything, every section
SHALL be left unchanged.

When the user selects more images than the target section has remaining capacity, the app
SHALL NOT exceed that section's limit.

#### Scenario: A document is added to the section it was started from

- **WHEN** the user activates the add control inside the manufacturer warranty section and
  selects an image
- **THEN** that image is shown as a warranty document
- **AND** the invoice section is unchanged

#### Scenario: A document is added to the extended warranty it was started from

- **WHEN** the user activates the add control inside the second extended warranty's invoice
  section and selects an image
- **THEN** that image is shown in that extended warranty's invoice section
- **AND** the item's own sections and the other extended warranty's sections are unchanged

#### Scenario: An empty section offers its header control

- **WHEN** the user views a section that holds no documents
- **THEN** its header control for adding a document is active

#### Scenario: A populated section offers only its add tile

- **WHEN** a section holds at least one document
- **THEN** its header control is no longer shown
- **AND** the add tile at the end of its strip is still active, up to the section's limit

#### Scenario: A source chooser is offered per section

- **WHEN** the user activates a section's add control
- **THEN** the app offers capturing with the camera and choosing from the photo library
- **AND** dismissing the chooser leaves every section as it was

#### Scenario: Permission for the chosen source is refused

- **WHEN** the user chooses a source and refuses the permission it requires
- **THEN** the app states which permission is needed and offers to open the system
  settings
- **AND** every section is left unchanged

#### Scenario: The picker is cancelled

- **WHEN** the user opens the camera or library picker and cancels without selecting
- **THEN** every section is left unchanged

#### Scenario: A multi-selection exceeds the remaining capacity

- **WHEN** a section already holds 8 documents and the user selects 5 images for it
- **THEN** the section ends up holding no more than 10 documents
- **AND** the app states the per-section limit has been reached

### Requirement: The user can replace, remove and reorder documents within a section

Within each section the user SHALL be able to replace an individual document with a newly
captured or chosen image, remove an individual document, and change a document's position
relative to the other documents in the same section.

All three actions SHALL apply only to the section they were performed in and SHALL leave
every other section's contents and ordering unchanged — including the sections of the
item's other extended warranties and the item's own sections.

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

#### Scenario: An edit inside an extended warranty stays there

- **WHEN** the user removes a document from an extended warranty's document section
- **THEN** only that section closes the gap and renumbers
- **AND** the item's own sections and every other extended warranty's sections are unchanged

### Requirement: Documents of both kinds are stored in app-private storage and not left behind

Every attached document SHALL be copied into app-private storage when it is attached, and
the app SHALL NOT depend on the location the image was originally selected from.

When a document is replaced, removed, or attached and then abandoned by leaving the edit
screen without saving, its stored image SHALL be discarded. Removing an extended warranty
SHALL discard the stored images of all of its documents. Deleting an item SHALL discard the
stored images of all its documents, of both kinds, in every scope — its own and those of
all of its extended warranties.

A failure to store, discard or record an individual document SHALL be handled without
losing the item: the remaining documents, the extended warranties and the item itself SHALL
still be saved.

#### Scenario: The original source location is not relied on

- **WHEN** a document has been attached and saved
- **THEN** it is still displayed after the originally selected image is no longer
  available at its original location

#### Scenario: A replaced document's image is discarded

- **WHEN** the user replaces a document in any section and saves
- **THEN** the replaced image is no longer retained by the app

#### Scenario: Leaving without saving strands nothing

- **WHEN** the user attaches documents to any section and leaves the edit screen
  without saving
- **THEN** the newly attached images are not retained by the app
- **AND** the item's saved documents are unchanged

#### Scenario: Removing an extended warranty discards its documents

- **WHEN** the user removes an extended warranty holding documents and saves
- **THEN** the stored images of that extended warranty's documents are discarded
- **AND** the item's own documents and those of its other extended warranties are retained

#### Scenario: Deleting an item discards every scope

- **WHEN** the user deletes an item holding its own documents and documents on two
  extended warranties
- **THEN** the stored images for every one of those sections are discarded

#### Scenario: A document failure does not lose the item

- **WHEN** one document cannot be stored or recorded while the item is being saved
- **THEN** the item is still saved with its other documents
- **AND** the user is told the document could not be saved

### Requirement: A document's kind survives export and import

Exporting a backup SHALL record which section each document belongs to — both its kind and
its scope — and importing that backup SHALL restore each document to the same section it
was exported from, attached to the same extended warranty where that is its scope.

Importing an archive that predates the split, or whose document entries do not state a
kind, SHALL treat every such document as an invoice document belonging to the item itself
rather than rejecting the archive or dropping the document. Importing SHALL NOT reject an
archive solely because of how document kinds or scopes are recorded.

A document whose image is missing from the archive or cannot be written SHALL be dropped
without failing the item, as with any other document.

#### Scenario: An exported split is restored intact

- **WHEN** an item with both invoice and warranty documents is exported and then imported
  into a library that does not already contain it
- **THEN** the imported item presents the same documents under the same sections as when
  it was exported

#### Scenario: An exported extended warranty's documents are restored to it

- **WHEN** an item whose extended warranty holds documents is exported and then imported
- **THEN** those documents are attached to that same extended warranty on the imported item
- **AND** they are not merged into the item's own sections

#### Scenario: A pre-split archive still imports

- **WHEN** the user imports a backup created before documents had sections
- **THEN** the archive is accepted
- **AND** every document in it is presented as an invoice document on the item itself

#### Scenario: An unreadable document does not fail the import

- **WHEN** an archive is missing the image for one warranty document
- **THEN** the item is still imported with its remaining documents
