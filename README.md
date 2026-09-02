# PingMe

A Chrome extension for reminders, webpage monitoring, and simple page automation.

## Features

- **Reminders** — create a countdown with an optional note.
- **Page monitors** — watch text, CSS selectors, or XPath expressions and receive a notification when they appear.
- **Site or Path scope** — monitor an entire site or only the current page in the current tab.
- **Once or CONT mode** — stop after a match or keep monitoring for future changes.

## Tasks

Tasks are optional automation scripts that run after a monitor matches. They can click buttons, wait for a page state, or complete a short workflow.

Select a Task from a monitor's Task menu. It runs only on the selected page and tab. Task scripts are in `tasks/`; see `tasks/README.md` to add one.

## Install and use

1. Open `chrome://extensions/` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this project folder.
4. Open a page, click the PingMe extension icon, and add a monitor.
5. Optionally select a Task from the monitor's Task menu.
