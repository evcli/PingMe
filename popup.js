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
    let discoveredTasks = []; // Store tasks for reuse in list items

    // Initialize: Get current URL and load data
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            currentUrl = tabs[0].url;
            loadReminders();
            loadMonitorRules();
            loadDynamicTasks(); // New dynamic discovery
        }
    });

    /**
     * Dynamically discovers tasks from manifest.json and task file metadata
     */
    async function loadDynamicTasks() {
        const taskSelect = document.getElementById('monitor-task');
        if (!taskSelect) return;

        const manifest = chrome.runtime.getManifest();
        // Look for scripts in tasks/ folder that follow the task_ prefix convention
        const scripts = manifest.content_scripts[0].js || [];
        const taskFiles = scripts.filter(s => s.includes('/task_'));

        for (const file of taskFiles) {
            try {
                const response = await fetch(chrome.runtime.getURL(file));
                const content = await response.text();
                
                // Get path relative to 'tasks/' and clean up filename
                const relativePath = file.replace('tasks/', '');
                const parts = relativePath.split('/');
                const fileName = parts.pop().replace('.js', '').replace(/^task_/, '');
                const folderPath = parts.join('/');
                
                // Final ID and display name: folder:name (e.g., pipeline:deploy)
                const taskId = folderPath ? `${folderPath}:${fileName}` : fileName;
                const taskDisplayName = taskId;
                
                // Save to global list
                discoveredTasks.push({ id: taskId, name: taskDisplayName });

                const option = document.createElement('option');
                option.value = taskId;
                option.textContent = taskDisplayName;
                taskSelect.appendChild(option);
            } catch (error) {
                console.error(`Failed to load task metadata for ${file}:`, error);
            }
        }
        // Refresh rule list to ensure they have the latest task options
        loadMonitorRules();
    }



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
        reminders.sort((a, b) => a.triggerTime - b.triggerTime).forEach(reminder => {
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
        const restrictToPath = document.getElementById('path-lock').checked;
        const autoStopEl = document.getElementById('auto-stop');
        const autoStop = autoStopEl ? autoStopEl.checked : true;

        if (!val) {
            alert('Please enter a text value or CSS/XPath selector.');
            return;
        }

        const id = `monitor-${Date.now()}`;
        const taskName = document.getElementById('monitor-task').value;
        const rule = {
            id,
            url: currentUrl,
            type,
            value: val,
            taskName: taskName, // New field
            isActive: true,
            restrictToPath: restrictToPath,
            autoStop: autoStop,
            createdAt: Date.now()
        };

        chrome.storage.local.get(['monitorRules'], (result) => {
            const rules = result.monitorRules || [];
            rules.push(rule);
            chrome.storage.local.set({ monitorRules: rules }, () => {
                monitorValue.value = '';
                document.getElementById('path-lock').checked = false;
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
        try { currentHostname = new URL(currentUrl).hostname; } catch (e) { }

        const pageRules = allRules.filter(r => {
            try { return new URL(r.url).hostname === currentHostname; }
            catch (e) { return currentUrl.includes(r.url); }
        });
        const otherRules = allRules.filter(r => {
            try { return new URL(r.url).hostname !== currentHostname; }
            catch (e) { return !currentUrl.includes(r.url); }
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
            header.style.marginTop = '8px';
            header.textContent = 'Other Sites';
            monitorList.appendChild(header);

            otherRules.forEach(rule => {
                monitorList.appendChild(createRuleItem(rule));
            });
        }
    }

    function createRuleItem(rule) {
        const item = document.createElement('div');
        item.className = 'item monitor-item';

        let badgeClass = 'badge-text';
        let badgeLabel = 'TEXT';
        if (rule.type === 'selector') {
            badgeClass = 'badge-selector';
            badgeLabel = 'CSS';
        } else if (rule.type === 'xpath') {
            badgeClass = 'badge-xpath';
            badgeLabel = 'XPATH';
        }

        let hostname = '';
        let fullPath = '';
        try { 
            const urlObject = new URL(rule.url);
            hostname = urlObject.hostname; 
            fullPath = urlObject.pathname;
            if (fullPath === '/') fullPath = '';
        } catch (e) { 
            hostname = rule.url; 
        }

        const scopeLabel = rule.restrictToPath ? 'Path' : 'Site';
        const scopeIcon = rule.restrictToPath ? '📍' : '🌐';
        const opacities = rule.isActive ? '1' : '0.5';

        const isAutoStop = rule.autoStop !== false;
        const autoStopLabel = isAutoStop ? 'ONCE' : 'CONT';
        const autoStopIcon = isAutoStop ? '🛑' : '🔄';

        item.innerHTML = `
            <div class="monitor-content" style="opacity: ${opacities};">
                <!-- Row 1: Value & Origin -->
                <div class="monitor-row monitor-row-top">
                    <div class="monitor-value-container">
                        <span class="badge ${badgeClass}">${badgeLabel}</span>
                        <span class="monitor-value" data-full-text="${rule.value}">${rule.value}</span>
                    </div>
                    <span class="monitor-origin" data-full-text="${hostname}${rule.restrictToPath ? fullPath : '/*'}">${hostname}${rule.restrictToPath ? fullPath : '/*'}</span>
                </div>
                
                <!-- Row 2: Controls -->
                <div class="monitor-row monitor-row-bottom">
                    <div class="monitor-controls-group">
                        <div class="monitor-scope ${rule.restrictToPath ? 'active' : ''}" title="Switch Scope: ${scopeLabel}">
                            <span class="scope-icon">${scopeIcon}</span>
                            <span class="scope-text">${scopeLabel}</span>
                        </div>
                        <div class="monitor-scope monitor-autostop ${isAutoStop ? 'active' : ''}" title="Switch Behavior: ${autoStopLabel}">
                            <span class="scope-icon">${autoStopIcon}</span>
                            <span class="scope-text">${autoStopLabel}</span>
                        </div>
                        <div class="monitor-task-selector">
                            <select class="rule-task-select" data-id="${rule.id}" title="Task triggered on element match">
                                <option value="">No Task</option>
                                ${discoveredTasks.map(t => `<option value="${t.id}" ${rule.taskName === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <div class="monitor-actions">
                <label class="switch" title="Monitor Active Status">
                    <input type="checkbox" class="toggle-active" ${rule.isActive ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
                <button class="delete-btn" data-id="${rule.id}">×</button>
            </div>
        `;

        const taskSelect = item.querySelector('.rule-task-select');
        if (taskSelect) {
            taskSelect.addEventListener('change', (e) => updateRuleTask(rule.id, e.target.value));
        }

        const scopeBadge = item.querySelector('.monitor-scope:not(.monitor-autostop)');
        if (scopeBadge) {
            scopeBadge.addEventListener('click', () => toggleRulePathLock(rule.id, !rule.restrictToPath));
        }

        const autoStopBadge = item.querySelector('.monitor-autostop');
        if (autoStopBadge) {
            autoStopBadge.addEventListener('click', () => toggleRuleAutoStop(rule.id, !isAutoStop));
        }

        const activeToggle = item.querySelector('.toggle-active');
        activeToggle.addEventListener('change', () => toggleRuleActive(rule.id, activeToggle.checked));

        const delBtn = item.querySelector('.delete-btn');
        delBtn.addEventListener('click', () => removeMonitorRule(rule.id));

        // Click to copy logic
        const valueEl = item.querySelector('.monitor-value');
        if (valueEl) {
            valueEl.addEventListener('click', (e) => {
                const text = valueEl.getAttribute('data-full-text') || valueEl.textContent;
                navigator.clipboard.writeText(text).then(() => {
                    // Feedback in global tooltip
                    const originalText = globalTooltip.textContent;
                    globalTooltip.textContent = 'Copied! ✅';
                    globalTooltip.style.color = '#00ff00';
                    setTimeout(() => {
                        globalTooltip.textContent = originalText;
                        globalTooltip.style.color = '';
                    }, 800);
                });
            });
        }

        return item;
    }

    function toggleRulePathLock(id, restrictToPath) {
        chrome.storage.local.get(['monitorRules'], (result) => {
            const rules = result.monitorRules || [];
            const rule = rules.find(r => r.id === id);
            
            if (!rule) return;

            let newUrl = rule.url;

            if (restrictToPath) {
                // Trying to switch to 'Path' lock
                try {
                    const ruleHostname = new URL(rule.url).hostname;
                    let currentHostname = '';
                    try { currentHostname = new URL(currentUrl).hostname; } catch(e) {}
                    
                    if (ruleHostname !== currentHostname) {
                        alert(`Cannot lock to path: You must be on the same domain (${ruleHostname}) to bind to a path.`);
                        return; // Abort the change
                    }
                    // Since domains match, bind to the current path
                    newUrl = currentUrl;
                } catch (e) {
                    console.error("URL Parsing error", e);
                }
            }

            const updatedRules = rules.map(r => {
                if (r.id === id) {
                    return { 
                        ...r, 
                        restrictToPath, 
                        url: newUrl 
                    };
                }
                return r;
            });
            chrome.storage.local.set({ monitorRules: updatedRules }, loadMonitorRules);
        });
    }

    function toggleRuleAutoStop(id, autoStop) {
        chrome.storage.local.get(['monitorRules'], (result) => {
            const rules = result.monitorRules || [];
            const updatedRules = rules.map(rule => {
                if (rule.id === id) {
                    return { ...rule, autoStop };
                }
                return rule;
            });
            chrome.storage.local.set({ monitorRules: updatedRules }, loadMonitorRules);
        });
    }

    function toggleRuleActive(id, isActive) {
        chrome.storage.local.get(['monitorRules'], (result) => {
            const rules = result.monitorRules || [];
            const updatedRules = rules.map(rule => {
                if (rule.id === id) {
                    return { 
                        ...rule, 
                        isActive
                    };
                }
                return rule;
            });
            chrome.storage.local.set({ monitorRules: updatedRules }, loadMonitorRules);
        });
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

    function updateRuleTask(id, taskName) {
        chrome.storage.local.get(['monitorRules'], (result) => {
            const rules = result.monitorRules || [];
            const updatedRules = rules.map(rule => {
                if (rule.id === id) {
                    return { ...rule, taskName };
                }
                return rule;
            });
            chrome.storage.local.set({ monitorRules: updatedRules });
            // No need to reload list here as select state is already correct UI-wise
        });
    }

    function formatRemainingTime(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / 1000 / 60) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));

        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }

    // --- GLOBAL TOOLTIP LOGIC ---
    const globalTooltip = document.getElementById('global-tooltip');

    const setupTooltip = () => {
        const handleOver = (e) => {
            const target = e.target.closest('[data-full-text]');
            if (!target) return;
            
            // Ignore internal movements
            if (e.relatedTarget && target.contains(e.relatedTarget)) return;

            const text = target.getAttribute('data-full-text');
            globalTooltip.textContent = text;
            globalTooltip.style.display = 'block';

            const rect = target.getBoundingClientRect();
            
            // Align position perfectly with the original text considering smaller padding (4px 8px)
            let finalX = rect.left - 8; 
            let finalY = rect.top - 4;

            const width = globalTooltip.offsetWidth;
            const height = globalTooltip.offsetHeight;
            const winWidth = window.innerWidth;
            const winHeight = window.innerHeight;

            // Constrain strictly within window
            if (finalX + width > winWidth - 8) finalX = Math.max(8, winWidth - width - 8);
            if (finalY + height > winHeight - 8) finalY = Math.max(8, winHeight - height - 8);
            if (finalX < 8) finalX = 8;
            if (finalY < 8) finalY = 8;

            globalTooltip.style.left = `${finalX}px`;
            globalTooltip.style.top = `${finalY}px`;
        };

        const handleOut = (e) => {
            const target = e.target.closest('[data-full-text]');
            if (!target) return;

            // Ignore internal movements
            if (e.relatedTarget && target.contains(e.relatedTarget)) return;

            globalTooltip.style.display = 'none';
        };

        document.body.addEventListener('mouseover', handleOver);
        document.body.addEventListener('mouseout', handleOut);
        
        // Hide tooltip immediately on any scroll to prevent floating artifacts
        window.addEventListener('scroll', () => {
            globalTooltip.style.display = 'none';
        }, true);
    };

    setupTooltip();

    setInterval(() => {
        loadReminders();
    }, 1000);
});
