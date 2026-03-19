// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const timerInput = document.getElementById('timer-minutes');
    const timerNote = document.getElementById('timer-note');
    const addReminderBtn = document.getElementById('add-reminder-btn');
    const reminderList = document.getElementById('reminder-list');

    const monitorType = document.getElementById('monitor-type');
    const monitorValue = document.getElementById('monitor-value');
    const addMonitorBtn = document.getElementById('add-monitor-btn');
    const clearAllMonitorsBtn = document.getElementById('clear-all-monitors-btn');
    const monitorList = document.getElementById('monitor-list');

    let currentUrl = '';

    // Initialize: Get current URL and load data
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            currentUrl = tabs[0].url;
            loadReminders();
            loadMonitorRules();
        }
    });

    // --- REMINDER LOGIC ---

    const addReminder = () => {
        const minutes = parseFloat(timerInput.value);
        const note = timerNote.value.trim();

        if (isNaN(minutes) || minutes <= 0) {
            alert('Please enter a valid number of minutes.');
            return;
        }

        const id = `reminder-${Date.now()}`;
        const triggerTime = Date.now() + minutes * 60000;

        chrome.alarms.create(id, { delayInMinutes: minutes });

        chrome.storage.local.get(['reminders'], (result) => {
            const reminders = result.reminders || [];
            reminders.push({ id, triggerTime, note: note || `${minutes}m timer` });
            chrome.storage.local.set({ reminders }, () => {
                timerInput.value = '';
                timerNote.value = '';
                loadReminders();
            });
        });
    };

    addReminderBtn.addEventListener('click', addReminder);

    [timerInput, timerNote].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addReminder();
        });
    });

    function loadReminders() {
        chrome.storage.local.get(['reminders'], (result) => {
            const reminders = result.reminders || [];
            displayReminders(reminders);
        });
    }

    function displayReminders(reminders) {
        if (reminders.length === 0) {
            reminderList.innerHTML = '<div class="empty-state">No active reminders</div>';
            return;
        }

        reminderList.innerHTML = '';
        reminders.sort((a,b) => a.triggerTime - b.triggerTime).forEach(reminder => {
            const item = document.createElement('div');
            item.className = 'item';

            const remainingMs = reminder.triggerTime - Date.now();
            const timeStr = remainingMs > 0 ? formatRemainingTime(remainingMs) : 'Triggering...';

            item.innerHTML = `
                <div class="item-info">
                    <span class="time">${timeStr}</span>
                    <span class="note">${reminder.note}</span>
                </div>
                <button class="delete-btn" data-id="${reminder.id}">×</button>
            `;

            const delBtn = item.querySelector('.delete-btn');
            delBtn.addEventListener('click', () => removeReminder(reminder.id));

            reminderList.appendChild(item);
        });
    }

    function removeReminder(id) {
        chrome.alarms.clear(id);
        chrome.storage.local.get(['reminders'], (result) => {
            const reminders = (result.reminders || []).filter(r => r.id !== id);
            chrome.storage.local.set({ reminders }, loadReminders);
        });
    }

    // --- MONITORING LOGIC ---

    const addMonitorRule = () => {
        const type = monitorType.value;
        const val = monitorValue.value.trim();

        if (!val) {
            alert('Please enter a text value or CSS selector.');
            return;
        }

        const id = `monitor-${Date.now()}`;
        const rule = {
            id,
            url: currentUrl,
            type,
            value: val,
            createdAt: Date.now()
        };

        chrome.storage.local.get(['monitorRules'], (result) => {
            const rules = result.monitorRules || [];
            rules.push(rule);
            chrome.storage.local.set({ monitorRules: rules }, () => {
                monitorValue.value = '';
                loadMonitorRules();
            });
        });
    };

    addMonitorBtn.addEventListener('click', addMonitorRule);

    monitorValue.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addMonitorRule();
    });

    clearAllMonitorsBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all monitoring rules across all pages?')) {
            clearAllMonitors();
        }
    });

    function loadMonitorRules() {
        chrome.storage.local.get(['monitorRules'], (result) => {
            const allRules = result.monitorRules || [];
            displayMonitorRules(allRules);
        });
    }

    function displayMonitorRules(allRules) {
        if (allRules.length === 0) {
            monitorList.innerHTML = '<div class="empty-state">No rules active</div>';
            return;
        }

        let currentHostname = '';
        try { currentHostname = new URL(currentUrl).hostname; } catch(e) {}

        const pageRules = allRules.filter(r => {
            try { return new URL(r.url).hostname === currentHostname; } 
            catch(e) { return currentUrl.includes(r.url); }
        });
        const otherRules = allRules.filter(r => {
            try { return new URL(r.url).hostname !== currentHostname; }
            catch(e) { return !currentUrl.includes(r.url); }
        });

        monitorList.innerHTML = '';

        if (pageRules.length > 0) {
            const header = document.createElement('div');
            header.className = 'list-header';
            header.textContent = 'This Site';
            monitorList.appendChild(header);
            
            pageRules.forEach(rule => {
                monitorList.appendChild(createRuleItem(rule));
            });
        }

        if (otherRules.length > 0) {
            const header = document.createElement('div');
            header.className = 'list-header';
            header.style.marginTop = '12px';
            header.textContent = 'Other Sites';
            monitorList.appendChild(header);

            otherRules.forEach(rule => {
                monitorList.appendChild(createRuleItem(rule));
            });
        }
    }

    function createRuleItem(rule) {
        const item = document.createElement('div');
        item.className = 'item';
        
        const badgeClass = rule.type === 'text' ? 'badge-text' : 'badge-selector';
        const badgeLabel = rule.type === 'text' ? 'TEXT' : 'CSS';
        
        let displayUrl = '';
        try { displayUrl = new URL(rule.url).hostname; } catch(e) { displayUrl = rule.url; }

        item.innerHTML = `
            <div class="item-info">
                <span class="note">${rule.value} <span class="badge ${badgeClass}">${badgeLabel}</span></span>
                <span class="note" style="font-size: 10px; opacity: 0.5;">URL: ${displayUrl}</span>
            </div>
            <button class="delete-btn" data-id="${rule.id}">×</button>
        `;

        const delBtn = item.querySelector('.delete-btn');
        delBtn.addEventListener('click', () => removeMonitorRule(rule.id));

        return item;
    }

    function removeMonitorRule(id) {
        chrome.storage.local.get(['monitorRules'], (result) => {
            const rules = (result.monitorRules || []).filter(r => r.id !== id);
            chrome.storage.local.set({ monitorRules: rules }, loadMonitorRules);
        });
    }

    function clearAllMonitors() {
        chrome.storage.local.set({ monitorRules: [] }, loadMonitorRules);
    }

    // --- HELPERS ---

    function formatRemainingTime(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / 1000 / 60) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));

        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }

    // Refresh display every second to update countdowns
    setInterval(() => {
        loadReminders();
    }, 1000);
});
