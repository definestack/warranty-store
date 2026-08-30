## Purpose

Defines the extended warranty cover a user records against an item — how many an item may
hold, what each one records, how its end date follows from its start date and duration,
how the whole set of cover periods determines when the item is still covered and therefore
what status it shows, how reminders are scheduled for each period, and how the periods
behave when the item is edited, deleted, exported and imported. This capability covers the
cover periods themselves; the documents attached to them are covered by `item-documents`.

## ADDED Requirements

### Requirement: An item can hold any number of extended warranties

An item SHALL be able to hold zero, one or many extended warranties. Holding none SHALL be
the default for a new item and SHALL remain a fully valid state: no field SHALL become
required, and no save SHALL be blocked, because an item has no extended warranty.

Extended warranties SHALL be independent of one another. Adding, editing or removing one
SHALL NOT alter the recorded fields, dates or documents of any other, and SHALL NOT alter
the item's manufacturer warranty.

The extended warranties of an item SHALL be presented in a stable order that survives
saving and reopening the item, so the user sees them in the same sequence every time.

#### Scenario: An item is saved with no extended warranty

- **WHEN** the user fills in a valid item and saves it without adding any extended warranty
- **THEN** the item is saved successfully
- **AND** the item shows no extended warranty when it is reopened

#### Scenario: Several extended warranties are held at once

- **WHEN** the user adds three extended warranties to an item and saves it
- **THEN** all three are stored against that item
- **AND** reopening the item presents all three in the order they were added

#### Scenario: Editing one extended warranty leaves the others alone

- **WHEN** the user changes the provider and duration of the second of three extended
  warranties and saves
- **THEN** only that extended warranty's provider and end date change
- **AND** the first and third keep their recorded fields, dates and documents unchanged

### Requirement: Each extended warranty records a provider, a duration, a period, a cost and notes

Every extended warranty SHALL record:

- a **provider** — the company or retailer the cover was bought from. Optional.
- a **duration** — a whole number of **months** or **years**, chosen by the user. Required.
  The number SHALL be a positive whole number; zero, a negative number, a fraction and a
  non-numeric entry SHALL all be rejected with a message naming the field.
- a **start date**. Required, and always present because it is defaulted.
- an **end date**, derived rather than entered.
- a **cost**. Optional. When given it SHALL be zero or greater, using the same currency
  presentation as the item's purchase price.
- **notes**. Optional, subject to the same maximum length as the item's own notes.

An extended warranty whose required fields are incomplete or invalid SHALL block saving the
item, SHALL identify which extended warranty and which field is at fault, and SHALL leave
every other extended warranty and the item itself unchanged.

#### Scenario: A complete extended warranty is recorded

- **WHEN** the user enters a provider, a duration of 2 years, a start date, a cost and
  notes, and saves
- **THEN** all of those values are stored against that extended warranty
- **AND** they are shown again unchanged when the item is reopened

#### Scenario: Only the duration is required

- **WHEN** the user adds an extended warranty, enters only a duration, and saves
- **THEN** the item saves successfully with that extended warranty
- **AND** its provider, cost and notes are recorded as absent

#### Scenario: An invalid duration blocks the save

- **WHEN** the user enters a duration of zero, a negative number or a non-numeric value
- **THEN** the item is not saved
- **AND** the app states which extended warranty's duration is invalid

#### Scenario: A negative cost blocks the save

- **WHEN** the user enters a negative cost on an extended warranty
- **THEN** the item is not saved
- **AND** the app states which extended warranty's cost is invalid

### Requirement: The end date is derived from the start date and the duration

An extended warranty's end date SHALL be derived from its start date and its duration and
SHALL NOT be entered directly. The app SHALL NOT offer any control that sets the end date
on its own, SHALL present it as calculated, and SHALL recompute it whenever the start date
or the duration changes — while editing, and again whenever the extended warranty is
saved.

The derived period SHALL cover exactly the stated duration and SHALL be inclusive of both
its start date and its end date, so that cover beginning the day after a previous period
ends leaves no uncovered day and no doubly-covered day between them.

A duration expressed in years SHALL be equivalent to the same number of twelve-month
periods; the two units SHALL differ only in how the duration is entered and displayed.

#### Scenario: The end date follows the duration

- **WHEN** the user changes an extended warranty's duration from 12 months to 24 months
- **THEN** the end date shown moves later to reflect the longer duration
- **AND** the item is saved with that recomputed end date

#### Scenario: The end date follows the start date

- **WHEN** the user moves an extended warranty's start date later by one month, leaving the
  duration unchanged
- **THEN** the end date shown moves later by the same amount

#### Scenario: The end date cannot be set directly

- **WHEN** the user views an extended warranty
- **THEN** no control is offered that would set its end date on its own
- **AND** the end date is presented as calculated from the start date and the duration

#### Scenario: Years and months agree

- **WHEN** one extended warranty records a duration of 2 years and another with the same
  start date records 24 months
- **THEN** both end on the same date

### Requirement: A new extended warranty starts where the existing cover ends

When the user adds an extended warranty, its start date SHALL be defaulted to the day after
the item's cover currently ends: the day after the manufacturer warranty's valid-till date
for the first extended warranty, and the day after the preceding extended warranty's end
date for each one added after it.

The defaulted start date SHALL be editable. Changing it SHALL NOT change any other extended
warranty's start date, and SHALL NOT retroactively change a start date the user has already
edited.

#### Scenario: The first extended warranty starts after the manufacturer warranty

- **WHEN** the user adds the first extended warranty to an item whose manufacturer warranty
  is valid until a given date
- **THEN** the start date is defaulted to the day after that date

#### Scenario: A second extended warranty starts after the first

- **WHEN** the user adds a second extended warranty to an item that already has one
- **THEN** the start date is defaulted to the day after the first one's end date

#### Scenario: The defaulted start date can be overridden

- **WHEN** the user changes a defaulted start date to a date of their choosing and saves
- **THEN** the chosen start date is stored
- **AND** the end date is recomputed from the chosen start date and the duration

### Requirement: Extended warranties are added, edited and removed while editing the item

The item edit screen SHALL let the user add an extended warranty, edit any of the fields of
an existing one, and remove one entirely. Removing an extended warranty SHALL remove its
recorded fields and its documents together, and SHALL leave the item's other extended
warranties in place and still in order.

The extended warranty section SHALL be optional and SHALL be presented as such: the user
SHALL be able to work on an item without engaging with it at all. If the user turns the
section off while extended warranties are recorded, the app SHALL confirm before discarding
them and SHALL leave them intact if the user declines.

All of these edits SHALL take effect only when the item is saved. Leaving the edit screen
without saving SHALL leave the item's stored extended warranties exactly as they were.

#### Scenario: An extended warranty is removed

- **WHEN** the user removes the first of two extended warranties and saves
- **THEN** the item holds only the remaining one
- **AND** the removed one's documents are no longer attached to the item

#### Scenario: Turning the section off is confirmed

- **WHEN** the user turns the extended warranty section off while an extended warranty is
  recorded
- **THEN** the app asks the user to confirm before discarding it
- **AND** declining leaves the extended warranty and its documents unchanged

#### Scenario: Leaving without saving changes nothing

- **WHEN** the user adds an extended warranty and leaves the edit screen without saving
- **THEN** the item's stored extended warranties are unchanged
- **AND** any images attached to the abandoned extended warranty are not retained

### Requirement: The item is covered until the furthest of its cover periods ends

An item's **coverage end date** SHALL be the latest of its manufacturer warranty valid-till
date and the end dates of all of its extended warranties.

Wherever the app presents or acts on how long an item is still covered — its status as
active, expiring soon or expired, its days-remaining text, its position in the expiring-soon
list, and whether it is treated as expired when reminders are scheduled — it SHALL use the
coverage end date. All of these SHALL agree with one another: an item SHALL NOT read as
covered in one place and expired in another.

The manufacturer warranty's valid-till date SHALL be unchanged by this and SHALL continue to
be derived from the purchase date and the warranty period. It SHALL continue to be presented
in its own right so the user can still see when the manufacturer cover itself ends.

An item with no extended warranty SHALL behave exactly as it did before extended warranties
existed, because its coverage end date is its manufacturer valid-till date.

#### Scenario: A live extended warranty keeps the item active

- **WHEN** an item's manufacturer warranty has already expired but it holds an extended
  warranty ending in a year's time
- **THEN** the item is shown as active
- **AND** its days-remaining text counts down to the extended warranty's end date

#### Scenario: The furthest period wins

- **WHEN** an item holds two extended warranties ending on different dates
- **THEN** the item's status and days-remaining follow the later of the two

#### Scenario: An expiring extended warranty surfaces the item

- **WHEN** an item's furthest cover ends within the next 30 days
- **THEN** the item appears in the expiring-soon list
- **AND** it is ordered against other items by that same date

#### Scenario: An item without extended cover is unaffected

- **WHEN** an item holds no extended warranty
- **THEN** its status, days-remaining and expiring-soon placement are exactly as they were
  before extended warranties existed

#### Scenario: The manufacturer end date is still visible

- **WHEN** the user views an item whose extended warranty outlasts the manufacturer warranty
- **THEN** the manufacturer warranty's valid-till date is still presented
- **AND** it is distinguishable from the extended cover's end date

### Requirement: Reminders are scheduled for every cover period

Reminders SHALL be scheduled for each of the item's cover periods independently: the
manufacturer warranty and every extended warranty each SHALL get their own reminders at 30
days before, 7 days before, and on the day that period ends. Reminders whose moment has
already passed SHALL NOT be scheduled, as today.

Each reminder SHALL identify the item it belongs to and SHALL still open that item when it
is tapped.

Reminders SHALL only be scheduled when the user has notifications enabled and the required
permission has been granted; refusing either SHALL leave the item and its extended
warranties saved regardless. A failure to schedule or cancel one reminder SHALL be skipped
without losing the others and without failing the save.

#### Scenario: Each period gets its own reminders

- **WHEN** an item with a manufacturer warranty and two extended warranties is saved with
  notifications enabled and permission granted
- **THEN** each of the three periods has its own 30-day, 7-day and end-of-period reminders
  scheduled, for the moments still in the future

#### Scenario: An extended warranty reminder opens its item

- **WHEN** the user taps a reminder raised for an extended warranty period
- **THEN** the app opens that extended warranty's item

#### Scenario: A past period schedules nothing

- **WHEN** an item is saved with an extended warranty that already ended
- **THEN** no reminders are scheduled for that period
- **AND** the other periods' upcoming reminders are still scheduled

#### Scenario: Notifications are off

- **WHEN** the user has notifications turned off and saves an item with extended warranties
- **THEN** the item and its extended warranties are saved
- **AND** no reminders are scheduled

### Requirement: Reminders follow every change to the set of cover periods

Whenever the set of cover period end dates for an item changes, the app SHALL cancel that
item's previously scheduled reminders and schedule the reminders for its current periods.
This SHALL apply when the manufacturer valid-till date moves, when an extended warranty is
added, when one is removed, and when an existing one's start date or duration changes its
end date.

When none of the item's cover period end dates has changed, the app SHALL NOT reschedule.

Deleting an item SHALL cancel the reminders for all of its cover periods.

Reminders scheduled before extended warranties existed SHALL be treated as the item's
manufacturer-period reminders and SHALL be cancelled and rescheduled with the rest, never
left behind as orphans.

#### Scenario: Adding an extended warranty reschedules

- **WHEN** the user adds an extended warranty to an existing item and saves, without
  touching the purchase date or warranty period
- **THEN** the item's reminders are rescheduled to cover both the manufacturer period and
  the new one

#### Scenario: Removing an extended warranty reschedules

- **WHEN** the user removes an extended warranty and saves
- **THEN** the reminders that had been scheduled for that period are cancelled
- **AND** the remaining periods keep their reminders

#### Scenario: An unrelated edit does not reschedule

- **WHEN** the user changes only the item's name or notes and saves
- **THEN** the item's existing reminders are left as they are

#### Scenario: Deleting the item cancels everything

- **WHEN** the user deletes an item holding two extended warranties
- **THEN** the reminders for the manufacturer period and both extended periods are cancelled

#### Scenario: Pre-existing reminders are adopted

- **WHEN** an installation that already had reminders scheduled is upgraded and one of those
  items is then edited so its cover changes
- **THEN** the previously scheduled reminders are cancelled along with the rest
- **AND** no reminder for that item survives that no longer matches a cover period

### Requirement: Extended warranties survive export and import

Exporting a backup SHALL record every extended warranty of every item, with all of its
recorded fields, its start and end dates, its order, and its documents. Importing that
backup SHALL restore each extended warranty to the same item with the same fields, dates,
order and documents.

Importing an archive that predates extended warranties, or whose items record none, SHALL
be accepted and SHALL import those items with no extended warranty, exactly as it does
today. Importing SHALL NOT reject an archive solely because of how extended warranties are
recorded, or because it records none.

Reminders for imported items SHALL be scheduled for all of their cover periods, subject to
the same conditions as any other save.

An extended warranty document whose image is missing from the archive or cannot be written
SHALL be dropped without failing the extended warranty or the item, as with any other
document.

#### Scenario: Extended cover is restored intact

- **WHEN** an item with two extended warranties is exported and then imported into a library
  that does not already contain it
- **THEN** the imported item holds both extended warranties with the same providers,
  durations, dates, costs, notes, order and documents

#### Scenario: A pre-extended-warranty archive still imports

- **WHEN** the user imports a backup created before extended warranties existed
- **THEN** the archive is accepted
- **AND** every item in it is imported with no extended warranty

#### Scenario: An unreadable document does not fail the import

- **WHEN** an archive is missing the image for one extended warranty document
- **THEN** the extended warranty is still imported with its remaining documents

#### Scenario: Imported cover is reminded on

- **WHEN** an item with a still-current extended warranty is imported with notifications
  enabled
- **THEN** reminders are scheduled for its manufacturer period and its extended period

### Requirement: Each cover period has a state and a countdown of its own

Every cover period — the manufacturer warranty and each extended warranty alike — SHALL
have a state derived from its own start and end dates, independent of the item's overall
state and of every other period's:

- **upcoming** when its start date has not yet arrived
- **expired** when its end date has passed
- **expiring soon** when it is running and its end date is within the same near-expiry
  window the app already uses for items
- **active** otherwise

Each period SHALL be presented with its state, its start and end dates as a range, and a
countdown. The countdown SHALL count **up to the start date** for an upcoming period and
**down to the end date** for every other state, and SHALL make clear which of the two it is
showing.

A period's state SHALL NOT change the item's own state. An item whose only extended
warranty is upcoming SHALL still be presented with the state its overall coverage gives it.

#### Scenario: A period that has not started yet

- **WHEN** the user views an item whose extended warranty starts next year
- **THEN** that extended warranty is shown as upcoming
- **AND** its countdown says how long until it starts, not how long until it ends

#### Scenario: A running period counts down to its end

- **WHEN** the user views an item whose manufacturer warranty is running
- **THEN** it is shown as active, or as expiring soon when its end is near
- **AND** its countdown says how long until it ends

#### Scenario: An ended period is shown as expired

- **WHEN** the user views an item whose manufacturer warranty ended last month
- **THEN** that period is shown as expired
- **AND** the item's own state still follows its overall coverage

#### Scenario: Periods in different states sit side by side

- **WHEN** an item's manufacturer warranty is running and its extended warranty has not
  started
- **THEN** the first is shown as active and the second as upcoming
- **AND** the item itself is shown as covered

### Requirement: The item detail screen presents cover as an ordered timeline

The item detail screen SHALL present the item's cover as a single ordered sequence: the
manufacturer warranty first, then each extended warranty in the item's stored order, so the
sequence reads forward in time as the cover was recorded.

Each entry SHALL show its state, its date range, its countdown, and its own document
sections. Each extended warranty entry SHALL additionally show its provider, its duration
as the user entered it, and its cost; an entry SHALL omit any of those the user left blank
rather than showing an empty value.

The item's summary SHALL state the date its cover runs until and how long remains, both
taken from the coverage end date. The item's details SHALL present the manufacturer
warranty's valid-till date and, when the item has extended cover, the date that cover runs
until, each labelled so the two cannot be confused.

An item with no extended warranty SHALL show a timeline containing only its manufacturer
warranty, and SHALL NOT show an extended-cover date in its details.

#### Scenario: Cover is listed in order

- **WHEN** the user views an item holding two extended warranties
- **THEN** the manufacturer warranty is presented first
- **AND** the two extended warranties follow it in the order they are stored

#### Scenario: An extended entry shows what was recorded

- **WHEN** the user views an extended warranty that recorded a provider, a duration and a
  cost
- **THEN** all three are shown against that entry
- **AND** an entry whose provider or cost was left blank shows neither an empty value nor a
  placeholder for it

#### Scenario: The summary follows the coverage end

- **WHEN** the user views an item whose extended warranty outlasts its manufacturer warranty
- **THEN** the summary states the date the extended cover runs until and how long remains
- **AND** the details present the manufacturer valid-till date and the extended cover's end
  date as two distinctly labelled values

#### Scenario: An item without extended cover

- **WHEN** the user views an item holding no extended warranty
- **THEN** the timeline shows only the manufacturer warranty
- **AND** no extended-cover date is shown in the item's details

### Requirement: The detail screen's add controls open the editor

The item detail screen SHALL remain read-only. Every control it offers for adding a
document or an extended warranty SHALL open the item's edit screen positioned at the
matching section, and SHALL NOT attach, replace, remove, reorder or create anything on its
own.

Returning from the edit screen SHALL leave the detail screen showing what was saved, so a
document or extended warranty added through one of these controls is visible without the
user having to reopen the item.

#### Scenario: An add control opens the editor at its section

- **WHEN** the user activates the add control on an extended warranty's document section
- **THEN** the item's edit screen opens positioned at that extended warranty's document
  section
- **AND** nothing has been attached or changed yet

#### Scenario: The detail screen reflects what was saved

- **WHEN** the user follows an add control into the editor, attaches a document, saves, and
  returns
- **THEN** the detail screen shows the newly attached document in the section it was added
  to

#### Scenario: Nothing is written from the detail screen

- **WHEN** the user activates an add control and leaves the editor without saving
- **THEN** the item is unchanged

### Requirement: Upgrading an installation preserves every existing item unchanged

Upgrading an installation SHALL leave every existing item, its manufacturer warranty, its
documents and its scheduled reminders intact. No item SHALL gain an extended warranty it was
not given, and no item SHALL change its status, its valid-till date or its reminders as a
result of the upgrade alone.

#### Scenario: Existing items are untouched by the upgrade

- **WHEN** an installation with existing items and scheduled reminders is upgraded
- **THEN** every item is still present with the same manufacturer warranty and documents
- **AND** none of them holds an extended warranty
- **AND** each one's status and days-remaining are what they were before the upgrade
