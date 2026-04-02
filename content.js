// content.js

let rules = [];
let ruleStates = {}; // Track current state of each rule (is it currently met?)

// Utility for more robust URL matching (ignores trailing dots/slashes/hashes)
function isUrlMatch(url1, url2, exact) {
  const normalizePath = (u) => {
    try {
      const p = new URL(u);
      let path = p.pathname;
      if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
      return { hostname: p.hostname, pathname: path };
    } catch(e) { return { hostname: u, pathname: u }; }
  };

  const n1 = normalizePath(url1);
  const n2 = normalizePath(url2);

  if (exact) {
    // ONLY compare Hostname + Pathname
    return n1.hostname === n2.hostname && n1.pathname === n2.pathname;
  } else {
    // Just compare Hostname
    return n1.hostname === n2.hostname;
  }
}

// Load rules for the current URL
function loadRules() {
  const currentUrl = window.location.href;

  chrome.storage.local.get(['monitorRules'], (result) => {
    const allRules = result.monitorRules || [];
    rules = allRules.filter(rule => {
      // 1. Check if the rule is even active
      if (rule.isActive === false) return false;

      // 2. Check URL restriction
      return isUrlMatch(currentUrl, rule.url, rule.restrictToPath);
    });

    if (rules.length > 0) {
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
    } else if (rule.type === 'xpath') {
      try {
        const result = document.evaluate(rule.value, document, null, XPathResult.ANY_TYPE, null);
        if (result.iterateNext()) {
          currentlyMet = true;
        }
      } catch (e) {
        console.error('[PingMe] Invalid XPath:', rule.value, e);
      }
    }

    // Trigger notification only on transition from false -> true
    if (currentlyMet && !ruleStates[rule.id]) {
      chrome.runtime.sendMessage({
        type: 'MONITOR_TRIGGERED',
        ruleId: rule.id, // Added ruleId
        message: `Condition reached for: ${rule.value} on ${window.location.hostname}`
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[PingMe] Notification failed:', chrome.runtime.lastError.message);
        }
      });
    }

    // Update local state
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
    
    rules = allRules.filter(rule => {
      // 1. Only active rules
      if (rule.isActive === false) return false;

      // 2. Exact Path or Domain match
      return isUrlMatch(currentUrl, rule.url, rule.restrictToPath);
    });

    checkRules();
  }
});
