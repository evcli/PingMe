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
    } catch (e) { return { hostname: u, pathname: u }; }
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

async function checkRules() {
  for (const rule of rules) {
    let currentlyMet = false;
    let targetElement = null;

    if (rule.type === 'text') {
      // Find the element containing the text to pass as trigger context
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.includes(rule.value)) {
          currentlyMet = true;
          targetElement = node.parentElement;
          break;
        }
      }
    } else if (rule.type === 'selector') {
      targetElement = document.querySelector(rule.value);
      if (targetElement) {
        currentlyMet = true;
      }
    } else if (rule.type === 'xpath') {
      try {
        const result = document.evaluate(rule.value, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        targetElement = result.singleNodeValue;
        if (targetElement) {
          currentlyMet = true;
        }
      } catch (e) {
        console.error('[PingMe] Invalid XPath:', rule.value, e);
      }
    }

    // Trigger notification only on transition from false -> true
    if (currentlyMet && !ruleStates[rule.id]) {
      let finalMessage = `Condition reached for: ${rule.value} on ${window.location.hostname}`;

      // Execute Task if bound
      if (rule.taskName && window.PingMeTasks && window.PingMeTasks[rule.taskName]) {
        try {
          const taskResult = await window.PingMeTasks[rule.taskName](targetElement);
          finalMessage = `[Success] ${taskResult}`;
        } catch (error) {
          console.error(`[PingMe] Task ${rule.taskName} failed:`, error);
          finalMessage = `[Failed] ${rule.taskName}: ${error.message}`;
        }
      }

      chrome.runtime.sendMessage({
        type: 'MONITOR_TRIGGERED',
        ruleId: rule.id,
        message: finalMessage
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[PingMe] Notification failed:', chrome.runtime.lastError.message);
        }
      });
    }

    // Update local state
    ruleStates[rule.id] = currentlyMet;
  }
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
