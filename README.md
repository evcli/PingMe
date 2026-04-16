# PingMe - Smart Web Monitor & Task Automation

A powerful Chrome extension that evolves from a simple countdown and DOM monitor into a fully-fledged, contextual RPA (Robotic Process Automation) engine.

## 🌟 Main Features

1. **Quick Reminder**
   - Enter minutes and set a countdown with optional notes.
   - **Shortcut**: Press `Enter` after typing to set it instantly.

2. **Smart Page Monitoring**
   - **Text / CSS / XPath Monitor**: Wait for specific elements or text to appear on a page.
   - **Scope Control**: Bind monitors to an entire **Site** (domain) or exclusively to the current **Path**.

3. **Task Automation (Parasitic Mounts)**
   - Turn passive alerts into active automation by binding **Tasks** to a Monitor.
   - **Safe Sandboxing**: When you bind a Task, the extension automatically locks the monitor to the **current exact path** and sets it to **Continuous (CONT)** mode to prevent misfiring across the site.
   - **Intelligent Lifecycle**: Tasks can execute multiple complex steps (like waiting for popovers, clicking buttons, submitting arrays). When the pipeline finishes (or safety timeout hits), the Task elegantly detaches itself and downgrades the rule back to a simple, site-wide notification monitor. 

4. **Background Execution**
   - Fully reliable. Even if you switch tabs, PingMe keeps observing. You'll get an OS-level notification when an automation pipeline completes or aborts safely.

## 🚀 Installation & Usage

1. Open Chrome and go to `chrome://extensions/`.
2. Turn on **"Developer mode"** (top right).
3. Click **"Load unpacked"** and select the `PingMe` folder.
4. **How to Use Tasks**: 
   - Open a page where you want automation to run.
   - Setup a monitor (e.g. XPath `//div[@class='status']`).
   - In the PingMe Popup, click the dropdown menu on your new rule and select a Task (e.g. `pipeline:deploy`).
   - Leave the page open. PingMe will drive the UI.

## 📂 Project Architecture

- `background.js`: System hub. Manages background timeouts, alarm routing, and state downgrade/cleanup.
- `content.js`: Injected into webpages. Responsible for throttled DOM-observation and executing bound Tasks.
- `popup.js`: The frontend interface. Parses tasks dynamically and handles smart visual locks.
- `tasks/`: Directory for programmable Automation Tasks.
