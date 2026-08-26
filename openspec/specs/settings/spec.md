## Purpose

Defines which controls the Settings screen and the app's navigation chrome present to the
user, and the rule that governs whether a control for a planned-but-unbuilt feature may
appear at all. This capability covers the presence, absence, and availability state of
those controls — not the behaviour of the features behind them.

## Requirements

### Requirement: Controls are only shown when the feature behind them works

The app SHALL NOT present an interactive control that appears operable but performs no
action. Every control in Settings and in the app's navigation chrome SHALL either carry
out the action its label describes, or be presented in an explicitly unavailable state — visibly
disabled, or acknowledging the interaction with a message saying the feature is not yet
available.

A control for a planned but unimplemented feature SHALL be omitted entirely unless it is
shown in one of those explicitly unavailable states.

#### Scenario: Every enabled control in Settings does something

- **WHEN** the user opens Settings and taps any control that is presented as enabled
- **THEN** the app performs the action named by that control, or opens the interface for
  performing it

#### Scenario: A planned feature has no operable-looking control

- **WHEN** a feature is on the roadmap but not implemented
- **THEN** Settings presents no enabled control for it
- **AND** any placeholder that is shown is visibly disabled or reports that the feature is
  not yet available when interacted with

### Requirement: Backup is offered only as local export and import

Settings SHALL present exactly two backup entry points: one that exports the user's data
to a local backup file, and one that imports data from a previously exported backup file.

The export control SHALL indicate when the last backup was taken, or that no backup has
ever been taken.

While backup to an external or cloud destination is unimplemented, Settings SHALL NOT
present any additional backup entry point, including one labelled as covering backup and
restore generally.

#### Scenario: Both working backup controls are present

- **WHEN** the user opens Settings
- **THEN** an export control is shown, subtitled with the date of the last backup, or with
  a statement that no backup has been taken
- **AND** an import control is shown, described as restoring items from a backup file

#### Scenario: No cloud or general backup entry point is shown

- **WHEN** the user opens Settings
- **THEN** no control is shown that offers backup or restore beyond the local export and
  import controls
- **AND** no control suggests backing up to an external or cloud destination

### Requirement: No account or sign-out controls are presented

The app has no account system, no sign-in, and no user identity. It SHALL NOT present
sign-out, sign-in, or account-management controls anywhere in the user interface while
that remains true.

#### Scenario: Settings has no sign-out control

- **WHEN** the user opens Settings and scrolls to the end of the screen
- **THEN** no sign-out control is shown

#### Scenario: The app's navigation chrome has no sign-out control

- **WHEN** the user moves between the app's top-level destinations
- **THEN** no sign-out control is shown in the navigation chrome
