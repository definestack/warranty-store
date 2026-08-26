# Warranty Tracker

A privacy-first Android app for tracking product warranties and invoice receipts.

Warranty Tracker helps users remember warranty expiry dates, store invoice images securely on the device, and receive reminders before warranties expire. The initial release is fully offline. Cloud backup to the user’s Google Drive is planned as a premium feature in a later phase.

---

## Features (Phase 1)

* Add and manage purchased items
* Track warranty expiry dates
* Attach invoice photos from camera or gallery
* Store all data locally on the device
* Search and filter items
* View items expiring soon
* Local backup and restore
* Offline-first design

---

## Planned Premium Features (Phase 2)

* Google Drive backup and restore
* Multi-device sync
* Automatic scheduled backups
* Advanced warranty insights

---

## Tech Stack

* **React Native**
* **Expo**
* **TypeScript**
* **Zustand** (state management)
* **SQLite** (`expo-sqlite`)
* **Expo Image Picker**
* **Expo File System**
* **Expo Notifications**
* **React Navigation**

---

## Project Structure

```text
src/
  screens/
  components/
  navigation/
  store/
  db/
  services/
  types/
  utils/
assets/
docs/
scripts/
```

---

## Getting Started

### Prerequisites

* Node.js LTS
* npm or pnpm
* Expo CLI (optional)
* Android Studio (for emulator) or a physical Android device with Expo Go

### Install

```bash
npm install
```

### Start Development Server

```bash
npx expo start
```

### Run on Android

Press **a** in the Expo terminal, or scan the QR code using **Expo Go** on your Android device.

---

## App Icons

The logo master lives at `assets/logo-master.png`. Every icon the app ships is derived from
it, so none of them is edited by hand:

| Asset | Where it shows up |
| --- | --- |
| `assets/icon.png` | launcher and store icon |
| `assets/android-icon-foreground.png` | Android adaptive icon, foreground layer |
| `assets/android-icon-background.png` | Android adaptive icon, background layer |
| `assets/android-icon-monochrome.png` | Android 13+ themed icon |
| `assets/splash-icon.png` | splash artwork |
| `assets/favicon.png` | browser tab on web |

Regenerate all six after changing the master:

```bash
python scripts/generate-app-icons.py
```

The script checks what only shows up on a device — that `icon.png` is fully opaque, that the
adaptive and themed layers stay inside Android's safe circle, that the splash keeps a
transparent margin — and fails rather than writing an asset that breaks one of those rules.
Add `--preview <dir>` to also get review renders: the icon under circular and squircle masks,
the themed icon recoloured, the splash on light and dark, and the favicon at 16px.

`android.adaptiveIcon.backgroundColor` in `app.json` must match
`android-icon-background.png`; the script prints the value to use.

Two caveats:

* **Python 3 with Pillow and NumPy is needed only for this script.** It is a development
  tool — building or running the app never needs Python.
* **Changing an icon needs a native rebuild** (`npm run android`) before a device shows it.
  An installed app or a stale dev client keeps displaying the old icon, so check for that
  before suspecting the asset.

---

## Database

The app uses a local SQLite database. Invoice images are stored in the app’s private file storage, and only the file path is saved in the database.

---

## Notifications

Local notifications are scheduled for:

* 30 days before expiry
* 7 days before expiry
* On the expiry date

No backend service is required for notifications.

---

## Backup Strategy

Phase 1 includes manual local export/import. Export bundles every item and its invoice images into a single self-contained zip that can be saved or shared anywhere. Import reads that zip back: the file is fully validated before anything is written, the user confirms the restore, and items are **merged** into the existing library — items already present are kept untouched, so nothing can be overwritten or lost. Reminders are rescheduled for restored items that have not yet expired.

Phase 2 will add encrypted backup to the user’s Google Drive app folder.

---

## Privacy

* No account required
* No data leaves the device in the free version
* No analytics planned for the initial release
* Invoice images remain in app-private storage

---

## Roadmap

* [ ] Phase 1 MVP

  * [ ] Item CRUD
  * [ ] Invoice image attachment
  * [ ] Expiry reminders
  * [ ] Search and filter
  * [x] Local backup/restore
* [ ] Phase 2 Cloud Backup

  * [ ] Google Sign-In
  * [ ] Google Drive app-folder backup
  * [ ] Restore flow
* [ ] Phase 3 Enhancements

  * [ ] OCR invoice scanning
  * [ ] Barcode scanning
  * [ ] PDF export
  * [ ] Home screen widgets

---

## Contributing

This project is currently maintained as a personal product project. Issues and suggestions are welcome.

---

## License

MIT License

---

## Author

**AV**

Built as a practical utility app to solve a real-world warranty management problem.
