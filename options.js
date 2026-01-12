// ABOUTME: Handles options state and validation for block rules.
// ABOUTME: Syncs settings to chrome.storage and updates live highlights.
const rulesInput = document.getElementById('rulesInput');
const rulesHighlight = document.getElementById('rulesHighlight');
const rulesErrors = document.getElementById('rulesErrors');
const enabledToggle = document.getElementById('enabledToggle');
const strictToggle = document.getElementById('strictToggle');
const debugToggle = document.getElementById('debugToggle');
const displayMode = document.getElementById('displayMode');

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const formatRegexError = (lineNumber, reason) => {
  const detailMap = {
    empty: 'regex pattern is empty',
    'too-long': 'regex pattern is too long',
    'nested-quantifier': 'regex contains nested quantifiers',
    backreference: 'regex contains a backreference',
    'invalid-regex': 'regex pattern is invalid',
  };
  const detail = detailMap[reason] || 'regex pattern is invalid';
  return `Line ${lineNumber}: ${detail}`;
};

const updateHighlights = (text) => {
  const lines = text.split('\n');
  const errorMessages = [];
  const rendered = lines
    .map((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('regex:')) {
        const pattern = trimmed.slice('regex:'.length);
        const validation = BlockerRules.validateRegexPattern(pattern);
        if (!validation.valid) {
          errorMessages.push(formatRegexError(index + 1, validation.reason));
          return `<span class="invalid">${escapeHtml(line)}</span>`;
        }
      }
      return `<span>${escapeHtml(line)}</span>`;
    })
    .join('\n');

  rulesHighlight.innerHTML = rendered;
  rulesErrors.textContent = errorMessages.join('\n');
};

const saveRules = (text) => {
  const rules = BlockerRules.parseRulesFromText(text);
  chrome.storage.local.set({ rules });
};

const loadRules = () => {
  chrome.storage.local.get({ rules: [] }, (items) => {
    const text = Array.isArray(items.rules) ? items.rules.join('\n') : '';
    rulesInput.value = text;
    updateHighlights(text);
  });
};

const loadSettings = () => {
  chrome.storage.sync.get(
    {
      enabled: true,
      strictMode: false,
      debugMode: false,
      displayMode: 'hide',
    },
    (items) => {
      enabledToggle.checked = Boolean(items.enabled);
      strictToggle.checked = Boolean(items.strictMode);
      debugToggle.checked = Boolean(items.debugMode);
      displayMode.value = items.displayMode || 'hide';
    }
  );
};

rulesInput.addEventListener('input', () => {
  const text = rulesInput.value;
  updateHighlights(text);
  saveRules(text);
});

rulesInput.addEventListener('scroll', () => {
  rulesHighlight.scrollTop = rulesInput.scrollTop;
  rulesHighlight.scrollLeft = rulesInput.scrollLeft;
});

const saveSettings = () => {
  chrome.storage.sync.set({
    enabled: enabledToggle.checked,
    strictMode: strictToggle.checked,
    debugMode: debugToggle.checked,
    displayMode: displayMode.value,
  });
};

enabledToggle.addEventListener('change', saveSettings);
strictToggle.addEventListener('change', saveSettings);
debugToggle.addEventListener('change', saveSettings);
displayMode.addEventListener('change', saveSettings);

loadRules();
loadSettings();
