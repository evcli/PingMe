// content.js

let rules = [];
let ruleStates = {}; // Track current state of each rule (is it currently met?)

// Load rules for the current URL
function loadRules() {
  const currentUrl = window.location.href;

  chrome.storage.local.get(['monitorRules'], (result) => {
    const allRules = result.monitorRules || [];
    rules = allRules.filter(rule => currentUrl.includes(rule.url));

    if (rules.length > 0) {
      console.log(`[PingMe] Active rules for this page:`, rules);
      startMonitoring();
    }
  });
}

function startMonitoring() {
  const observer = new MutationObserver((mutations) => {
    checkRules();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Initial check in case content is already present
  checkRules();
}

function checkRules() {
  rules.forEach(rule => {
    let currentlyMet = false;

    if (rule.type === 'text') {
      if (document.body.innerText.includes(rule.value)) {
        currentlyMet = true;
      }
    } else if (rule.type === 'selector') {
      if (document.querySelector(rule.value)) {
        currentlyMet = true;
      }
    }

    // Trigger notification only on transition from false -> true
    if (currentlyMet && !ruleStates[rule.id]) {
      chrome.runtime.sendMessage({
        type: 'MONITOR_TRIGGERED',
        message: `Condition reached for: ${rule.value} on ${window.location.hostname}`
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[PingMe] Notification failed:', chrome.runtime.lastError.message);
        }
      });
    }

    // Update state
    ruleStates[rule.id] = currentlyMet;
  });
}

// Initial load
loadRules();

// Re-load rules if storage changes (e.g., from popup)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.monitorRules) {
    const currentUrl = window.location.href;
    const allRules = changes.monitorRules.newValue || [];
    rules = allRules.filter(rule => currentUrl.includes(rule.url));
    // Clear triggered set for newly added rules if needed (or keep it for the session)
    console.log(`[PingMe] Rules updated:`, rules);
    checkRules();
  }
});
