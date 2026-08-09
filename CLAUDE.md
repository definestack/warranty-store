\# CLAUDE.md



Guidance for Claude when working in this repository.



\## Project Overview



Warranty Store is an \*\*offline-first Android application\*\* for tracking product warranties and invoice receipts.



Primary goals:



\* Track warranty expiry dates

\* Store invoice images locally

\* Send local expiry reminders

\* Work fully offline in Phase 1

\* Add Google Drive backup in a later premium phase



Target platform: \*\*Android\*\* (Expo / React Native).



\---



\# Technology Stack



\* \*\*Expo\*\* (managed workflow)

\* \*\*React Native\*\*

\* \*\*TypeScript\*\*

\* \*\*Zustand\*\* for app state

\* \*\*SQLite (`expo-sqlite`)\*\* for persistent data

\* \*\*AsyncStorage\*\* for small settings

\* \*\*Expo Image Picker\*\*

\* \*\*Expo File System\*\*

\* \*\*Expo Notifications\*\*

\* \*\*React Navigation\*\*



Do not introduce additional frameworks unless explicitly requested.



\---



\# Architecture Rules



Use a simple feature-oriented structure:



```text

src/

&#x20; screens/

&#x20; components/

&#x20; store/

&#x20; db/

&#x20; services/

&#x20; types/

&#x20; utils/

```



\## Responsibilities



\* `db/` → SQLite schema, migrations, repositories

\* `services/` → notifications, backup, file handling

\* `store/` → Zustand state stores

\* `screens/` → UI screens

\* `components/` → reusable UI components

\* `types/` → shared TypeScript types



Avoid business logic directly inside screens.



\---



\# Persistence Guidelines



\## SQLite



SQLite is the \*\*source of truth\*\* for all warranty records.



Store:



\* item details

\* warranty dates

\* invoice file paths

\* categories

\* future reminder metadata



Never store image binary data in SQLite.



\## AsyncStorage



Use only for small settings such as:



\* theme

\* notification enabled

\* onboarding completed

\* last backup time

\* premium unlocked flag



Do not use AsyncStorage for warranty records.



\## Zustand



Use for runtime UI state only:



\* loaded items

\* search text

\* filters

\* selected item

\* loading states

\* modal visibility



Zustand state should be reconstructable from SQLite.



\---



\# Image Handling



When a user selects an invoice image:



1\. Copy it into app-private storage.

2\. Compress large images before saving.

3\. Save only the local URI in SQLite.

4\. Use deterministic filenames when practical.



Never depend on the original gallery URI long term.



\---



\# Notifications



Use \*\*local notifications only\*\*.



Schedule reminders:



\* 30 days before expiry

\* 7 days before expiry

\* on expiry date



No backend service should be introduced for notifications.



\---



\# Coding Standards



\* Prefer \*\*functional React components\*\*.

\* Use \*\*TypeScript types/interfaces\*\* for all public structures.

\* Prefer `async/await` over promise chains.

\* Keep functions small and focused.

\* Avoid deeply nested logic.

\* Add comments only when intent is not obvious.

\* Prefer composition over inheritance.



Example:



```ts

export interface WarrantyItem {

&#x20; id: string;

&#x20; name: string;

&#x20; purchaseDate: string;

&#x20; warrantyMonths: number;

&#x20; invoiceUri?: string;

}

```



\---



\# UI Guidelines



\* Mobile-first layout

\* Large touch targets

\* Clear spacing

\* Native-looking interactions

\* Support dark mode where practical

\* Avoid heavy custom animations unless requested



\---



\# Dependency Policy



Before adding a dependency, verify:



1\. Works with Expo managed workflow.

2\. Actively maintained.

3\. Solves a real problem.

4\. Cannot be replaced by an existing Expo API.



Avoid adding dependencies for trivial utilities.



\---



\# Database Migrations



\* Use explicit migration functions.

\* Never drop user tables automatically.

\* Preserve existing data during schema upgrades.

\* Add new columns with sensible defaults.



\---



\# Error Handling



\* Fail gracefully.

\* Show user-friendly messages.

\* Log unexpected errors in development.

\* Avoid silent failures for file or database operations.



\---



\# Testing Expectations



When implementing features:



\* Run TypeScript type checking.

\* Ensure no Expo runtime warnings.

\* Verify Android emulator behavior.

\* Prefer deterministic logic that can be unit tested later.



\---



\# Git Guidelines



\* Keep commits focused.

\* Use descriptive commit messages.

\* Do not commit build artifacts.

\* Do not commit credentials or API keys.

\* Keep `README.md` updated when features change.



\---



\# Future Features (Planned, Not Yet Implemented)



\* Google Sign-In

\* Google Drive backup/restore

\* Automatic cloud backup

\* Multi-device sync

\* OCR invoice scanning

\* Barcode scanning

\* PDF export

\* Home screen widgets



Do not scaffold these features unless explicitly requested.



\---



\# Preferred Implementation Style



When multiple valid solutions exist, choose the one that is:



1\. Simpler

2\. Easier to maintain

3\. More offline-friendly

4\. More compatible with Expo

5\. Easier for a solo developer to understand six months later



\---



\# Current Product Decision



The app name is \*\*Warranty Store\*\*.



Use the following identifiers unless told otherwise:



\* Package: `in.definestack.warrantystore`

\* Repository: `warranty-store`



\---



\# When Unsure



Ask for clarification rather than making large architectural changes.



