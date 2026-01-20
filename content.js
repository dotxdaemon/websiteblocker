// ABOUTME: Observes Google results and tags blocked containers for styling.
// ABOUTME: Applies rule matching to URLs without relying on volatile classes.
const BLOCKED_ATTR = 'data-ext-blocked';
const REVEALED_ATTR = 'data-ext-revealed';
const STYLE_ID = 'ext-blocker-style';

const defaultSettings = {
  enabled: true,
  displayMode: 'hide',
  strictMode: false,
  debugMode: false,
};

let settings = { ...defaultSettings };
let rules = [];
let blockedCount = 0;

let processedAnchors = new WeakSet();
const pendingAnchors = new Set();
let pendingHandle = null;

const logDebug = (...args) => {
  if (settings.debugMode) {
    console.log('[Result Blocker]', ...args);
  }
};

const logWarning = (...args) => {
  console.warn('[Result Blocker]', ...args);
};

const createStyleContent = () => {
  if (settings.displayMode === 'hide') {
    return `
      [${BLOCKED_ATTR}="true"] { display: none !important; }
    `;
  }

  return `
    [${BLOCKED_ATTR}="true"] {
      max-height: 120px !important;
      overflow: hidden !important;
      position: relative !important;
    }
    [${BLOCKED_ATTR}="true"] *:not([data-ext-show-button="true"]) {
      filter: blur(4px) !important;
    }
    [${BLOCKED_ATTR}="true"][${REVEALED_ATTR}="true"] {
      max-height: none !important;
      overflow: visible !important;
    }
    [${BLOCKED_ATTR}="true"][${REVEALED_ATTR}="true"] * {
      filter: none !important;
    }
    [${BLOCKED_ATTR}="true"] [data-ext-show-button="true"] {
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      z-index: 2147483647 !important;
      filter: none !important;
      background: #1a73e8 !important;
      color: #fff !important;
      border: none !important;
      border-radius: 6px !important;
      padding: 6px 10px !important;
      font-size: 12px !important;
      cursor: pointer !important;
    }
    [${BLOCKED_ATTR}="true"][${REVEALED_ATTR}="true"] [data-ext-show-button="true"] {
      display: none !important;
    }
  `;
};

const ensureStyle = () => {
  const existing = document.getElementById(STYLE_ID);
  if (!settings.enabled) {
    if (existing) {
      existing.remove();
    }
    return;
  }

  const style = existing || document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = createStyleContent();
  if (!existing) {
    document.head.appendChild(style);
  }
};

const updateBlockedCount = () => {
  blockedCount = document.querySelectorAll(`[${BLOCKED_ATTR}="true"]`).length;
};

const clearBlockedState = () => {
  document.querySelectorAll(`[${BLOCKED_ATTR}="true"]`).forEach((element) => {
    element.removeAttribute(BLOCKED_ATTR);
    element.removeAttribute(REVEALED_ATTR);
    const button = element.querySelector('[data-ext-show-button="true"]');
    if (button) {
      button.remove();
    }
  });
  updateBlockedCount();
};

const ensureShowButton = (container) => {
  if (settings.displayMode !== 'blur') {
    return;
  }
  const existing = container.querySelector('[data-ext-show-button="true"]');
  if (existing) {
    return;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Show';
  button.setAttribute('data-ext-show-button', 'true');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    container.setAttribute(REVEALED_ATTR, 'true');
  });
  container.appendChild(button);
};

const setBlockedState = (container, rule) => {
  if (!container || !(container instanceof HTMLElement)) {
    return;
  }
  if (!settings.enabled) {
    container.removeAttribute(BLOCKED_ATTR);
    container.removeAttribute(REVEALED_ATTR);
    return;
  }

  if (rule) {
    container.setAttribute(BLOCKED_ATTR, 'true');
    ensureShowButton(container);
  } else {
    container.removeAttribute(BLOCKED_ATTR);
    container.removeAttribute(REVEALED_ATTR);
    const button = container.querySelector('[data-ext-show-button="true"]');
    if (button) {
      button.remove();
    }
  }
};

const isVisible = (element) => {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const findResultContainer = (anchorElement) => {
  let current = anchorElement;
  let closestBlock = null;
  let candidate = null;
  let depth = 0;
  while (current && current !== document.body && depth < 10) {
    if (current instanceof HTMLElement) {
      if (['DIV', 'ARTICLE', 'LI'].includes(current.tagName)) {
        if (!closestBlock) {
          closestBlock = current;
        }
        const hasHeading = current.querySelector('h3');
        const hasAnchor = current.querySelector('a[href]');
        const headingCount = current.querySelectorAll('h3').length;
        if (hasHeading && hasAnchor && headingCount === 1 && current !== anchorElement) {
          candidate = current;
        }
      }
    }
    current = current.parentElement;
    depth += 1;
  }

  if (candidate) {
    logDebug('Container found', candidate);
    return candidate;
  }
  if (closestBlock) {
    logWarning('Falling back to closest block for anchor', anchorElement);
    return closestBlock;
  }

  const fallback = anchorElement.closest('div') || anchorElement.parentElement;
  if (fallback) {
    logWarning('Falling back to closest container for anchor', anchorElement);
  }
  return fallback;
};

const collectCandidateAnchors = (root) => {
  const anchors = [];
  const seenAnchors = new Set();
  const addAnchor = (anchor) => {
    if (!anchor || seenAnchors.has(anchor)) {
      return;
    }
    anchors.push(anchor);
    seenAnchors.add(anchor);
  };
  const headingAnchors = root.querySelectorAll('a[href] h3');
  headingAnchors.forEach((heading) => {
    const anchor = heading.closest('a[href]');
    if (anchor && isVisible(heading)) {
      addAnchor(anchor);
    }
  });

  const imageAnchors = root.querySelectorAll('a[href] img');
  imageAnchors.forEach((img) => {
    const anchor = img.closest('a[href]');
    if (!anchor || !isVisible(img)) {
      return;
    }
    const decoded = BlockerRules.decodeGoogleUrl(anchor.href);
    if (decoded.includes('imgurl=')) {
      anchors.push(anchor);
      return;
    }
    const parsed = (() => {
      try {
        return new URL(anchor.href, window.location.origin);
      } catch (error) {
        return null;
      }
    })();
    if (parsed && parsed.pathname.includes('imgres')) {
      addAnchor(anchor);
    }
  });

  const allAnchors = Array.from(root.querySelectorAll('a[href]'));
  const ruleAnchors = BlockerRules.filterAnchorsForRules(allAnchors, rules);
  ruleAnchors.forEach((anchor) => {
    if (isVisible(anchor)) {
      addAnchor(anchor);
    }
  });

  return anchors;
};

const collectUrlsForContainer = (container) => {
  if (!container) {
    return [];
  }
  const anchors = Array.from(container.querySelectorAll('a[href]'));
  return anchors.map((anchor) => anchor.href).filter(Boolean);
};

const evaluateAnchor = (anchor) => {
  if (!settings.enabled) {
    return;
  }
  if (processedAnchors.has(anchor)) {
    return;
  }
  processedAnchors.add(anchor);

  const container = findResultContainer(anchor);
  if (!container) {
    return;
  }

  const urls = settings.strictMode
    ? collectUrlsForContainer(container)
    : [anchor.href];

  let matchedRule = false;
  for (const url of urls) {
    logDebug('Checking URL', url);
    const match = BlockerRules.shouldBlock(url, rules);
    if (match) {
      matchedRule = match;
      break;
    }
  }

  setBlockedState(container, matchedRule);
};

const processPendingAnchors = () => {
  pendingHandle = null;
  const anchors = Array.from(pendingAnchors);
  pendingAnchors.clear();
  anchors.forEach((anchor) => evaluateAnchor(anchor));
  updateBlockedCount();
};

const scheduleProcessing = () => {
  if (pendingHandle) {
    return;
  }
  if (window.requestIdleCallback) {
    pendingHandle = window.requestIdleCallback(processPendingAnchors, {
      timeout: 500,
    });
  } else {
    pendingHandle = window.setTimeout(processPendingAnchors, 200);
  }
};

const queueAnchors = (root) => {
  if (!root || !(root instanceof Element)) {
    return;
  }
  const anchors = collectCandidateAnchors(root);
  anchors.forEach((anchor) => {
    if (!processedAnchors.has(anchor)) {
      pendingAnchors.add(anchor);
    }
  });
  if (anchors.length > 0) {
    scheduleProcessing();
  }
};

const observeMutations = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          queueAnchors(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

const refreshAll = () => {
  processedAnchors = new WeakSet();
  queueAnchors(document.body);
};

const loadSettings = () =>
  new Promise((resolve) => {
    chrome.storage.sync.get(defaultSettings, (items) => {
      settings = { ...defaultSettings, ...items };
      resolve();
    });
  });

const loadRules = () =>
  new Promise((resolve) => {
    chrome.storage.local.get({ rules: [] }, (items) => {
      rules = Array.isArray(items.rules) ? items.rules : [];
      resolve();
    });
  });

const initialize = async () => {
  await loadSettings();
  await loadRules();
  ensureStyle();
  refreshAll();
  observeMutations();
};

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes) {
    settings = { ...settings, ...defaultSettings };
    Object.keys(changes).forEach((key) => {
      settings[key] = changes[key].newValue;
    });
    ensureStyle();
    if (!settings.enabled) {
      clearBlockedState();
    } else {
      refreshAll();
    }
  }

  if (area === 'local' && changes && changes.rules) {
    rules = Array.isArray(changes.rules.newValue) ? changes.rules.newValue : [];
    refreshAll();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'getBlockedCount') {
    sendResponse({ count: blockedCount });
  }
  if (message?.type === 'getActiveDomain') {
    sendResponse({ domain: BlockerRules.getDomainFromUrl(window.location.href) });
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    refreshAll,
    findResultContainer,
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
