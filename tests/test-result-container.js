// ABOUTME: Ensures result container selection prefers the full result block.
// ABOUTME: Uses a DOM implementation to verify container traversal behavior.
const assert = require('assert');
const { JSDOM } = require('jsdom');

const setupGlobals = (dom) => {
  global.console = { ...console, warn() {} };
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

const multiDom = new JSDOM(`<!doctype html>
  <html>
    <body>
      <div id="results">
        <div class="g" id="result-one">
          <div class="yuRUbf">
            <a href="https://blocked.example.com">
              <h3>Blocked Result</h3>
            </a>
          </div>
        </div>
        <div class="g" id="result-two">
          <div class="yuRUbf">
            <a href="https://allowed.example.com">
              <h3>Allowed Result</h3>
            </a>
          </div>
        </div>
      </div>
    </body>
  </html>`);

multiDom.window.document.readyState = 'loading';
setupGlobals(multiDom);

const multiAnchor = multiDom.window.document.querySelector('#result-two a[href]');
const multiContainer = findResultContainer(multiAnchor);

assert.strictEqual(multiContainer?.id, 'result-two');

const imageDom = new JSDOM(`<!doctype html>
  <html>
    <body>
      <div class="grid" id="grid">
        <div class="tile" id="tile">
          <a href="https://www.google.com/imgres?imgurl=https://images.example.com/cat.jpg">
            <img src="https://images.example.com/cat.jpg" alt="Cat" />
          </a>
        </div>
      </div>
    </body>
  </html>`);

imageDom.window.document.readyState = 'loading';
setupGlobals(imageDom);

const imageAnchor = imageDom.window.document.querySelector('a[href]');
const imageContainer = findResultContainer(imageAnchor);

assert.strictEqual(imageContainer?.id, 'tile');

console.log('Result container tests passed.');
