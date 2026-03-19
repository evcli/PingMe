# PingMe - Chrome Reminder & Monitor

A lightweight Chrome extension for quick countdown timers and webpage content monitoring.

## 🌟 Main Features

1. **Quick Reminder**
   - Enter minutes and set a countdown.
   - Add optional notes (e.g., "Meeting", "Drink Water").
   - **Shortcut**: Press `Enter` after typing to set it instantly.

2. **Page Monitoring**
   - **Text Monitor**: Notifies you when specific text appears on a page.
   - **Element Monitor (CSS)**: Notifies you when a specific element (like a button or status tag) shows up.
   - **Pipeline Ready**: If a status (like "Waiting for Approval") disappears and then reappears, you will be notified again.

3. **Smart Notifications**
   - **Click to Switch**: Click a notification to instantly switch back to the monitored page and focus the window.
   - **High Quality**: Using PNG icons for better display on all screens.

## 🚀 Installation

1. Download the project folder.
2. Open Chrome and go to `chrome://extensions/`.
3. Turn on **"Developer mode"** (top right).
4. Click **"Load unpacked"**.
5. Select the `PingMe` folder.

## 📂 Project Files

- `manifest.json`: Extension settings.
- `background.js`: Handles timers and notification clicks.
- `content.js`: Watches for changes on the webpage.
- `popup.html/js/css`: The pop-up menu UI and logic.
- `icons/`: Extension icons.
