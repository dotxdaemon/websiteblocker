// ABOUTME: Coordinates popup actions with the active Google tab.
// ABOUTME: Adds new rules and displays the current blocked count.
const statusText = document.getElementById('status');
const blockedCount = document.getElementById('blockedCount');
const blockButton = document.getElementById('blockButton');

const getActiveTab = () =>
  new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });

const sendMessage = (tabId, message) =>
  new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response || null);
    });
  });

const loadBlockedCount = async (tabId) => {
  const response = await sendMessage(tabId, { type: 'getBlockedCount' });
  if (response && typeof response.count === 'number') {
    blockedCount.textContent = `Blocked ${response.count} results on this page.`;
  } else {
    blockedCount.textContent = 'Blocked count unavailable on this page.';
  }
};

const loadDomain = async (tabId) => {
  const response = await sendMessage(tabId, { type: 'getActiveDomain' });
  if (response && response.domain) {
    statusText.textContent = `Current site: ${response.domain}`;
    blockButton.disabled = false;
    return response.domain;
  }
  statusText.textContent = 'Open a Google results page to use this button.';
  blockButton.disabled = true;
  return '';
};

const addRule = (domain) => {
  chrome.storage.local.get({ rules: [] }, (items) => {
    const rules = Array.isArray(items.rules) ? items.rules : [];
    if (!rules.includes(domain)) {
      rules.push(domain);
    }
    chrome.storage.local.set({ rules }, () => {
      statusText.textContent = `Rule added for ${domain}`;
    });
  });
};

const init = async () => {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    statusText.textContent = 'No active tab found.';
    blockButton.disabled = true;
    return;
  }
  const domain = await loadDomain(tab.id);
  await loadBlockedCount(tab.id);
  blockButton.addEventListener('click', () => {
    if (domain) {
      addRule(domain);
    }
  });
};

init();
