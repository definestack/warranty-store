## Purpose

Defines what the user sees from the moment the app process starts until the first app
screen is usable: the branded splash presented by the operating system, how long it is
held while the local database initializes, the branded state shown if initialization is
still running when the splash ends, and the branded, recoverable state shown when
initialization fails. This capability covers the launch experience only, not what
initialization itself does.

## ADDED Requirements

### Requirement: The app SHALL present a branded splash screen at launch

From the moment the app process starts, the operating system SHALL present a splash
screen showing the app logo centred on a solid background. The user SHALL NOT see an
unbranded blank or default system window before it.

The logo SHALL be displayed at its natural proportions, without stretching or cropping,
on every supported screen size and density.

The splash SHALL be the first thing shown on a cold start regardless of how the app was
opened, including when it was opened by tapping a warranty reminder notification. Opening
the app from a notification SHALL still route the user to the item the notification refers
to once launch completes.

#### Scenario: A cold start shows the splash

- **WHEN** the user opens the app from the launcher after it has been fully closed
- **THEN** the app logo is shown centred on a solid background before any app screen
- **AND** no blank or unbranded window is shown first

#### Scenario: A launch from a reminder notification shows the splash

- **WHEN** the user taps a warranty reminder notification while the app is closed
- **THEN** the splash is shown while the app starts
- **AND** the user is taken to the item that reminder refers to once launch completes

### Requirement: The splash SHALL match the active system theme

The splash background and logo treatment SHALL follow the device's light or dark
appearance setting, and the background colour SHALL match the background the app renders
in that same appearance.

The user SHALL NOT see a light flash when launching in dark appearance, nor a dark flash
when launching in light appearance.

#### Scenario: Launching in dark appearance

- **WHEN** the device is set to dark appearance and the user opens the app
- **THEN** the splash is shown on the app's dark background colour
- **AND** no light-coloured frame appears at any point during launch

#### Scenario: Launching in light appearance

- **WHEN** the device is set to light appearance and the user opens the app
- **THEN** the splash is shown on the app's light background colour
- **AND** no dark-coloured frame appears at any point during launch

### Requirement: The splash SHALL be held until the app is ready to render

The splash SHALL remain visible until local database initialization has settled — either
successfully or with an error. The user SHALL NOT see an empty, partially rendered, or
placeholder frame between the splash disappearing and the app's first screen appearing.

The splash SHALL be dismissed once initialization settles and SHALL NOT be held any longer
than that; it SHALL NOT be held for a fixed minimum display time.

#### Scenario: Initialization completes while the splash is up

- **WHEN** database initialization finishes before the splash is dismissed
- **THEN** the splash is dismissed
- **AND** the app's first screen is already rendered underneath, with no intermediate
  blank or unstyled frame

#### Scenario: Initialization is fast

- **WHEN** database initialization completes almost immediately
- **THEN** the splash is dismissed as soon as it does
- **AND** the app does not linger on the splash for an artificial delay

### Requirement: A branded state SHALL be shown while initialization is still running

If database initialization has not settled by the time the splash is dismissed, the app
SHALL show a state that repeats the splash composition — the same logo on the same
background — together with an indication that the app is still preparing. The transition
from the splash into this state SHALL NOT change the logo's appearance, position, or the
background colour.

This state SHALL follow the app's own theme setting, and its message SHALL be shown in the
user's selected language.

#### Scenario: Initialization outlives the splash

- **WHEN** database initialization is still running after the splash is dismissed
- **THEN** the app shows the same logo on the same background as the splash
- **AND** it indicates that the app is still preparing
- **AND** the logo does not move or change size as the splash gives way to it

#### Scenario: The preparing message is localized

- **WHEN** the app is set to a supported language other than English and initialization is
  still running
- **THEN** the preparing message is shown in that language

### Requirement: A failed initialization SHALL be shown in the branded frame and be retryable

If database initialization fails, the splash SHALL be dismissed rather than left up, and
the app SHALL show the failure inside the same branded frame: the logo on the same
background, a message explaining that the database could not be opened, and the underlying
error detail.

The failure state SHALL offer a retry action. Choosing it SHALL attempt initialization
again without the user having to close and reopen the app. If the retry succeeds the app
SHALL continue to its first screen; if it fails again the failure state SHALL be shown
again and SHALL remain retryable.

The failure message and the retry action SHALL be shown in the user's selected language.

#### Scenario: Initialization fails

- **WHEN** database initialization fails
- **THEN** the splash is dismissed
- **AND** the failure is shown on the same branded background as the splash, with the
  error detail and a retry action

#### Scenario: The user retries and it succeeds

- **WHEN** the user chooses retry from the failure state and initialization succeeds
- **THEN** the app continues to its first screen without the app being restarted

#### Scenario: The user retries and it fails again

- **WHEN** the user chooses retry from the failure state and initialization fails again
- **THEN** the failure state is shown again
- **AND** retry remains available

#### Scenario: The app is never left on the splash

- **WHEN** database initialization ends in any outcome, successful or failed
- **THEN** the splash is dismissed
- **AND** the app is never left showing the splash indefinitely

### Requirement: The splash artwork SHALL be replaceable without code changes

The splash logo SHALL be sourced from a single image asset that is shared by the
system-presented splash and by the in-app branded states. Replacing that asset file SHALL
update every launch state consistently, with no change to application code or to which
screens reference it.

#### Scenario: The logo asset is replaced

- **WHEN** the splash logo asset file is replaced with different artwork
- **THEN** the system splash, the preparing state, and the failure state all show the new
  artwork
- **AND** no application code has to change for them to do so
