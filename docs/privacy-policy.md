# Privacy Policy for Warranty Store

**Last updated:** October 26, 2026

This Privacy Policy describes how Warranty Store ("the App", "we", "us") handles information when you use the application. Warranty Store is developed and published by DefineStack.

Warranty Store is designed to work **fully offline**. We do not operate any backend server for this app, and we do not collect, transmit, or sell your personal data to anyone.

---

## 1. Summary

- No account or sign-up is required to use the App.
- All data you enter — warranty items, invoice images, documents, and settings — is stored **locally on your device only**.
- The App does not transmit your data to us, to the developer, or to any third party.
- The App does not contain advertising and does not use third-party analytics or tracking SDKs.
- Backup and restore are local, file-based operations that stay on your device (or wherever you choose to save/share the backup file, such as your own cloud storage app).

---

## 2. Information We Collect

Warranty Store does **not** collect information on any server, because the App has no backend. The following information is created and stored **only on your device**, in the App's private local storage (SQLite database and private file storage):

| Data                      | Description                                                                                        | Where it's stored                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Warranty item details     | Product name, purchase date, price, store, category, warranty length, notes                        | Local SQLite database on your device                                                                          |
| Extended warranty details | Provider, duration, and cost for any extended warranty you add                                     | Local SQLite database on your device                                                                          |
| Invoice images            | Photos of invoices/receipts, taken with your camera or selected from your photo gallery            | Local app-private file storage on your device                                                                 |
| Invoice documents         | PDF documents you attach to an item                                                                | Local app-private file storage on your device                                                                 |
| Reminder schedule         | Dates for 30-day, 7-day, and expiry-day notifications, derived from the warranty data you enter    | Local to your device, via the Android notification system                                                     |
| App preferences           | Theme (light/dark), language, onboarding status, and similar settings                              | Local device storage (AsyncStorage)                                                                           |
| Backup files              | A single export file (and attached documents) that you create using the App's local backup feature | Stored only where you choose to save it (your device, or a location you pick, such as your own cloud storage) |

We do not collect your name, email address, location, contacts, device identifiers, advertising IDs, or any analytics/usage data. We do not have user accounts, so we have no way to identify you.

---

## 3. Permissions the App Requests and Why

Android will ask you to grant the following permissions. The App only uses them for the stated purpose, and never to transmit data off your device:

- **Camera** — to let you take a photo of an invoice or receipt to attach to a warranty item.
- **Photos / Media Library** — to let you pick an existing photo of an invoice or receipt from your gallery.
- **Notifications** — to show local reminders before and on the day a warranty expires.
- **Storage / File access** (as required by Android version) — to let you pick a PDF document to attach, and to let you save or share a backup export file.

You can decline or revoke any of these permissions in your device's Settings; declining a permission only disables the related feature (e.g., declining Camera means you can still add an invoice from your gallery or skip attaching one).

---

## 4. How Your Information Is Used

Information you enter is used solely to provide the App's core functionality on your device:

- Displaying your list of warranties and their status (active, expiring soon, expired).
- Calculating warranty expiry dates.
- Scheduling and showing local expiry reminder notifications.
- Displaying attached invoice images and documents.
- Creating a backup export file when you request one, and restoring your data when you import a backup file you select.

We do not use your information for advertising, profiling, or any purpose unrelated to the above.

---

## 5. Data Sharing and Third Parties

We do not share, sell, rent, or trade your data with any third party, because we never receive it in the first place — it stays on your device.

The App does not integrate any third-party analytics, advertising, or crash-reporting SDKs that collect personal data.

The only way your data leaves your device is if **you** choose to:

- Share a backup export file using Android's built-in share functionality (e.g., to save it to your own cloud storage, email it to yourself, or move it via a file manager), or
- Use your device's camera/gallery apps, which are provided by Android/your device manufacturer and governed by their own privacy policies.

A future version of the App may offer an optional Google Drive backup feature. If and when this feature is introduced, this Privacy Policy will be updated beforehand to describe what data is involved, and the feature will be opt-in.

---

## 6. Data Storage and Security

- All warranty records, invoice images, and documents are stored in the App's private storage area on your device, which is sandboxed by Android and not accessible to other apps.
- Backup export files are stored only at the location you choose when exporting (e.g., your device's downloads folder or a shared/cloud location you pick).
- Because there is no server-side storage, there is no remote database for us to secure or that could be breached by us. The security of your data depends on your device's own security (e.g., screen lock, device encryption) and on how you handle any backup files you create.

---

## 7. Data Retention and Deletion

- Your data remains on your device for as long as the App is installed, or until you delete individual items within the App.
- Uninstalling the App removes the App's local database and private file storage from your device, in line with standard Android app uninstall behavior.
- Backup files you have exported and saved elsewhere (e.g., to cloud storage) are not affected by uninstalling the App and must be deleted separately by you, if desired.
- Since we do not collect or store your data on any server, there is no remote copy for us to delete; there is nothing for you to request from us in this respect.

---

## 8. Children's Privacy

Warranty Store is a general-purpose productivity utility and is not directed at children. We do not knowingly collect personal information from anyone, including children, because the App does not collect personal information on any server.

---

## 9. Your Choices and Controls

- You can view, edit, or delete any warranty item, invoice image, or document at any time within the App.
- You can disable notifications at any time via Android's notification settings for the App.
- You can revoke Camera, Photos, or Storage permissions at any time via Android's app permission settings.
- You can export a full backup of your data at any time, and you can delete your data by deleting items within the App or by uninstalling the App.

---

## 10. Changes to This Policy

We may update this Privacy Policy from time to time, for example if we add new features that change how data is handled (such as an optional cloud backup feature). We will update the "Last updated" date above when changes are made. Continued use of the App after an update constitutes acceptance of the revised policy.

---

## 11. Contact Us

If you have questions about this Privacy Policy or the App's data practices, contact us at:

**Email:** definestack@gmail.com
