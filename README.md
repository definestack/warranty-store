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

Phase 1 includes manual local export/import. Phase 2 will add encrypted backup to the user’s Google Drive app folder.

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
  * [ ] Local backup/restore
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
