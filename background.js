// ABOUTME: Initializes default settings and rules for the extension.
// ABOUTME: Ensures storage has expected keys on install.
const defaultSettings = {
  enabled: true,
  displayMode: 'hide',
  strictMode: false,
  debugMode: false,
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(defaultSettings, (items) => {
    chrome.storage.sync.set(items);
  });

  chrome.storage.local.get({ rules: [] }, (items) => {
    chrome.storage.local.set(items);
  });
});
