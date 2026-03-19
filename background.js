// background.js

// Map to store notification IDs and their associated tabs
const notificationTabMap = new Map();

// Update extension icon based on active tasks
function updateExtensionIcon() {
  chrome.storage.local.get(['reminders', 'monitorRules'], (result) => {
    // Defensive check: ensure active status and count are correctly derived
    const remindersCount = Array.isArray(result.reminders) ? result.reminders.length : 0;
    const monitorsCount = Array.isArray(result.monitorRules) ? result.monitorRules.length : 0;
    const count = remindersCount + monitorsCount;
    const isActive = count > 0;

    const iconPath = isActive ? {
      "16": "icons/icon16_active.png",
      "48": "icons/icon48_active.png",
      "128": "icons/icon128_active.png"
    } : {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    };

    chrome.action.setIcon({ path: iconPath });
    
    // Set badge text based on total count
    if (isActive) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });
}

// Initial icon check
chrome.runtime.onInstalled.addListener(updateExtensionIcon);
chrome.runtime.onStartup.addListener(updateExtensionIcon);

// Listen for storage changes to update icon
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.reminders || changes.monitorRules)) {
    updateExtensionIcon();
  }
});


chrome.alarms.onAlarm.addListener((alarm) => {
  const reminderId = alarm.name;

  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    const reminder = reminders.find(r => r.id === reminderId);

    if (reminder) {
      const notificationId = `reminder-${Date.now()}`;
      chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'PingMe Reminder',
        message: reminder.note || 'Timer is up!',
        priority: 2
      });

      // Remove the triggered reminder from storage
      const updatedReminders = reminders.filter(r => r.id !== reminderId);
      chrome.storage.local.set({ reminders: updatedReminders });
    }
  });
});

// Handle messages from content script for monitoring
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'MONITOR_TRIGGERED') {
    const notificationId = `monitor-${Date.now()}`;
    
    // Store tab information for this notification
    if (sender.tab) {
      notificationTabMap.set(notificationId, {
        tabId: sender.tab.id,
        windowId: sender.tab.windowId
      });
    }

    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'PingMe Monitoring Alert',
      message: request.message,
      priority: 2
    });
    sendResponse({ success: true });
  }
});

// Handle notification click
chrome.notifications.onClicked.addListener((notificationId) => {
  const tabInfo = notificationTabMap.get(notificationId);
  if (tabInfo) {
    chrome.tabs.update(tabInfo.tabId, { active: true });
    chrome.windows.update(tabInfo.windowId, { focused: true });
    // Cleanup
    notificationTabMap.delete(notificationId);
  }
});

// Cleanup map when notifications are closed
chrome.notifications.onClosed.addListener((notificationId) => {
  notificationTabMap.delete(notificationId);
});
