# PingMe - Chrome Reminder & Monitor

A lightweight Chrome extension for quick countdown timers and webpage content monitoring.

## 🌟 Main Features

1. **Quick Reminder**
   - Enter minutes and set a countdown.
   - Add optional notes (e.g., "Meeting", "Drink Water").
   - **Shortcut**: Press `Enter` after typing to set it instantly.

2. **Page Monitoring**
   - **Text Monitor**: Notifies you when specific text appears anywhere on the page (e.g., "Ready").
   - **CSS Element Monitor**: Notifies you when a specific element exists (e.g., `.submit-btn`).
   - **XPath Selector Monitor**: **(Power User)** For precise selection combining tags, classes, and text content (e.g., `//div[@class='status' and contains(., 'abort')]`).
   - **Pipeline Ready**: If a condition (like a status change) is met, you will be notified instantly. Works across different tabs.

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
