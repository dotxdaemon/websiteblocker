// ABOUTME: Validates content script behavior that resets processed anchors safely.
// ABOUTME: Uses stubs to exercise refreshAll without browser APIs.
const assert = require('assert');

class ElementMock {
  querySelectorAll() {
    return [];
  }

  getBoundingClientRect() {
    return { width: 0, height: 0 };
  }
}

const setupGlobals = () => {
  global.Element = ElementMock;
  global.HTMLElement = ElementMock;
  global.document = {
    body: new ElementMock(),
    head: {
      appendChild() {},
    },
    querySelectorAll() {
      return [];
    },
    getElementById() {
      return null;
    },
    addEventListener() {},
    readyState: 'loading',
  };
  global.window = {
    location: {
      origin: 'https://example.com',
      href: 'https://example.com',
    },
    requestIdleCallback: null,
    setTimeout,
  };
  global.MutationObserver = class {
    observe() {}
  };
  global.chrome = {
    storage: {
      sync: {
        get(defaults, callback) {
          callback(defaults);
        },
      },
      local: {
        get(defaults, callback) {
          callback(defaults);
        },
      },
      onChanged: {
        addListener() {},
      },
    },
    runtime: {
      onMessage: {
        addListener() {},
      },
    },
  };
  global.BlockerRules = {
    filterAnchorsForRules() {
      return [];
    },
    decodeGoogleUrl(url) {
      return url;
    },
    shouldBlock() {
      return false;
    },
    getDomainFromUrl() {
      return '';
    },
  };
};

setupGlobals();

const { refreshAll } = require('../content');

assert.doesNotThrow(() => {
  refreshAll();
});

console.log('Content tests passed.');
