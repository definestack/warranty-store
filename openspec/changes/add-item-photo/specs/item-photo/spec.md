## Purpose

Defines the optional photo a user may attach to a warranty item — how it is captured,
replaced and removed, where it is displayed in place of the category icon, and how the
stored image file behaves across saving, cancelling, deleting, exporting and importing.
This capability covers the item's own photo only, not the invoice images attached to it.

## ADDED Requirements

### Requirement: An item may carry at most one optional photo

A warranty item SHALL be able to carry at most one photo. The photo SHALL be optional:
an item with no photo is fully valid and SHALL be creatable, editable and savable without
one. The photo SHALL NOT participate in validation — its absence SHALL never block saving,
and no field SHALL become required because a photo was or was not attached.

An item's photo SHALL persist across app restarts and SHALL still be shown when the item is
next opened.

#### Scenario: An item is saved without a photo

- **WHEN** the user fills in a valid item and saves it without attaching a photo
- **THEN** the item is saved successfully
- **AND** the item is shown with its category icon wherever items are displayed

#### Scenario: An attached photo survives a restart

- **WHEN** the user attaches a photo to an item, saves it, and later reopens the app
- **THEN** the item is still shown with that photo

### Requirement: The user can attach a photo from the camera or the photo library

When the user activates the item photo control, the app SHALL offer a choice of two
sources: taking a new photo with the camera, or choosing an existing one from the photo
library. The user SHALL be able to dismiss that choice without changing the current photo.

If the permission required by the chosen source has not been granted, the app SHALL
request it. If permission is refused, the app SHALL explain which permission is needed and
offer to open the system settings, SHALL leave the item's current photo unchanged, and
SHALL NOT fail the save.

If the user cancels the camera or library picker without selecting an image, the item's
current photo SHALL be left unchanged.

#### Scenario: A source chooser is offered

- **WHEN** the user taps the item photo control
- **THEN** the app offers taking a photo with the camera and choosing one from the photo
  library
- **AND** dismissing the chooser leaves the item's photo as it was

#### Scenario: A photo is captured with the camera

- **WHEN** the user chooses the camera source, grants camera permission, and takes a photo
- **THEN** that photo is shown as the item's photo on the edit screen before saving

#### Scenario: Permission for the chosen source is refused

- **WHEN** the user chooses a source and refuses the permission it requires
- **THEN** the app states which permission is needed and offers to open the system settings
- **AND** the item's photo is unchanged

#### Scenario: The picker is cancelled

- **WHEN** the user opens the camera or the photo library and backs out without selecting
  an image
- **THEN** the item's photo is unchanged and no error is reported

### Requirement: The user can replace or remove an item photo

An item that already has a photo SHALL offer both a way to replace it — choosing a new
image from either source — and a way to remove it, leaving the item with no photo. Both
SHALL be available while creating an item and while editing an existing one.

Removing a photo SHALL NOT delete the item or any of its other data, and SHALL NOT remove
any invoice images attached to the item.

#### Scenario: A photo is replaced

- **WHEN** an item has a photo and the user attaches a different one
- **THEN** the newly chosen photo is shown as the item's photo
- **AND** after saving, the item is displayed with the new photo everywhere it appears

#### Scenario: A photo is removed

- **WHEN** an item has a photo and the user removes it, then saves
- **THEN** the item has no photo
- **AND** the item is displayed with its category icon
- **AND** the item's other details and its invoice images are unaffected

### Requirement: The item photo is displayed in place of the category icon

Wherever the app represents an item by its category icon — the warranty list rows, the
expiring-soon cards, and the item detail summary — an item that has a photo SHALL show
that photo in the same position and at the same size as the icon it replaces. An item with
no photo SHALL continue to show its category icon exactly as before.

If a photo cannot be displayed — for example its file is missing — the app SHALL fall back
to the category icon rather than showing a broken or empty placeholder.

#### Scenario: The warranty list shows item photos

- **WHEN** the user views the warranty list and some items have photos
- **THEN** each item with a photo is shown with its photo where the category icon would be
- **AND** each item without a photo is shown with its category icon

#### Scenario: The item detail summary shows the photo

- **WHEN** the user opens an item that has a photo
- **THEN** the detail summary shows that photo in place of the category icon

#### Scenario: A missing photo file falls back to the icon

- **WHEN** an item's photo file can no longer be read
- **THEN** the item is displayed with its category icon and remains usable

### Requirement: Item photos are stored in app-private storage and not left behind

An attached photo SHALL be copied into app-private storage, and only that copy SHALL be
relied on afterwards; the app SHALL NOT depend on the original camera or gallery location.
Large photos SHALL be reduced before being stored so a photo library does not consume
excessive device storage.

Stored photo files SHALL NOT outlive their usefulness. When a photo is replaced, removed,
or its item is deleted, the file that is no longer referenced SHALL be deleted. If the user
attaches a photo and then leaves the screen without saving, the newly stored file SHALL NOT
be left behind, and an existing saved photo SHALL remain untouched.

A failure to store or delete a photo file SHALL NOT abandon or undo the rest of the
operation: saving an item, deleting an item and restoring a backup SHALL each complete, with
the failure reported to the user where it affects what they see.

#### Scenario: The original source location is not relied on

- **WHEN** the user attaches a photo from the gallery and the original image is later
  removed from the gallery
- **THEN** the item still shows its photo

#### Scenario: A replaced photo's file is discarded

- **WHEN** the user replaces an item's photo and saves
- **THEN** the previously stored photo file is deleted

#### Scenario: Leaving without saving strands nothing

- **WHEN** the user attaches a photo to an existing item and leaves the screen without
  saving
- **THEN** the item still shows the photo it had before
- **AND** the file stored for the abandoned attachment is not left behind

#### Scenario: Deleting an item deletes its photo

- **WHEN** the user deletes an item that has a photo
- **THEN** the item's stored photo file is deleted along with its invoice images

#### Scenario: A photo failure does not lose the item

- **WHEN** storing an item's photo fails while saving
- **THEN** the item's other details are still saved
- **AND** the user is told the photo could not be saved

### Requirement: Item photos are included in backup and restore

A backup archive SHALL include each item's photo, and importing that archive SHALL restore
the photo alongside the item so a restored library looks the same as the exported one.

Compatibility SHALL be preserved in both directions: a backup taken before item photos
existed SHALL still import successfully, with its items simply having no photo, and an item
whose photo is absent, unreadable, or invalid in the archive SHALL be imported without a
photo rather than causing the import to fail.

#### Scenario: An exported photo is restored

- **WHEN** the user exports a backup containing an item with a photo and imports that
  archive on a device without the item
- **THEN** the item is imported and displayed with its photo

#### Scenario: An older backup still imports

- **WHEN** the user imports a backup that was exported before item photos existed
- **THEN** the import succeeds and every item is imported with no photo

#### Scenario: An unreadable photo does not fail the import

- **WHEN** an archive references a photo file that is missing or unreadable
- **THEN** the item is imported without a photo and the rest of the import completes
