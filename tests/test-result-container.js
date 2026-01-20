// ABOUTME: Ensures result container selection prefers the full result block.
// ABOUTME: Uses a DOM implementation to verify container traversal behavior.
const assert = require('assert');
const { JSDOM } = require('jsdom');

const setupGlobals = (dom) => {
  global.window = dom.window;
  global.document = dom.window.document;
  global.Element = dom.window.Element;
  global.HTMLElement = dom.window.HTMLElement;
  global.MutationObserver = dom.window.MutationObserver;
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

const dom = new JSDOM(`<!doctype html>
  <html>
    <body>
      <div class="g" id="result">
        <div class="outer">
          <div class="yuRUbf">
            <a href="https://example.com">
              <h3>Example Title</h3>
            </a>
          </div>
          <div class="snippet">Snippet text</div>
        </div>
      </div>
    </body>
  </html>`);

dom.window.document.readyState = 'loading';
setupGlobals(dom);

const { findResultContainer } = require('../content');

const anchor = dom.window.document.querySelector('a[href]');
const container = findResultContainer(anchor);

assert.strictEqual(container?.id, 'result');

console.log('Result container tests passed.');
