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

let observer = null;
let mutationTimeout = null;

function startMonitoring() {
  if (observer) return; // Prevent multiple observers
  
  // Use a throttled observer to prevent high CPU usage on pages with frequent DOM changes
  observer = new MutationObserver((mutations) => {
    if (!mutationTimeout) {
      mutationTimeout = setTimeout(() => {
        checkRules();
        mutationTimeout = null;
      }, 1000); // 1s throttle
    }
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
  for (const rule of rules) {
    let currentlyMet = false;
    let targetElement = null;

    if (rule.type === 'text') {
      // Fast pre-check: skip expensive TreeWalker if text is definitely nowhere in the body
      if (document.body.textContent.includes(rule.value)) {
        // Find the element containing the text to pass as trigger context
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent.includes(rule.value)) {
            currentlyMet = true;
            targetElement = node.parentElement;
            break;
          }
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
      ruleStates[rule.id] = true; // Instantly lock state to prevent race conditions during async tasks
      
      const sendMessage = (msg) => {
        chrome.runtime.sendMessage({
          type: 'MONITOR_TRIGGERED',
          ruleId: rule.id,
          message: msg
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[PingMe] Notification failed:', chrome.runtime.lastError.message);
          }
        });
      };

      // Execute Task if bound
      if (rule.taskName && window.PingMeTasks && window.PingMeTasks[rule.taskName]) {
        window.PingMeTasks[rule.taskName](targetElement)
          .then(taskResult => {
            let isSuccess = true;
            let msg = '';
            if (taskResult && typeof taskResult === 'object' && 'success' in taskResult) {
              isSuccess = taskResult.success;
              msg = taskResult.message || '';
            } else {
              msg = String(taskResult);
            }

            if (isSuccess) {
              sendMessage(`[Success] ${msg}`);
            } else {
              sendMessage(`[Failed] ${rule.taskName}: ${msg}`);
            }
          })
          .catch(error => {
            console.warn(`[PingMe] Task ${rule.taskName} failed:`, error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            sendMessage(`[Failed] ${rule.taskName}: ${errorMsg}`);
          });
      } else {
        sendMessage(`Condition reached for: ${rule.value} on ${window.location.hostname}`);
      }
    } else if (!currentlyMet) {
      // Update local state directly to reset
      ruleStates[rule.id] = false;
    }
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

    if (rules.length > 0) {
      startMonitoring();
    }
    checkRules();
  }
});
