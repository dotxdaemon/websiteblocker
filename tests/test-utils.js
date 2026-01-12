// ABOUTME: Exercises rule parsing and URL matching behavior.
// ABOUTME: Uses Node asserts to validate utils.js without browser APIs.
const assert = require('assert');
const { shouldBlock, decodeGoogleUrl } = require('../utils');

const rules = [
  'example.com',
  '*.sample.org',
  'contains:reddit',
  'regex:^https://news\\.ycombinator\\.com',
];

assert.strictEqual(
  shouldBlock('https://example.com/page', rules),
  'example.com'
);

assert.strictEqual(
  shouldBlock('https://sub.example.com/page', rules),
  'example.com'
);

assert.strictEqual(
  shouldBlock('https://deep.sample.org/path', rules),
  '*.sample.org'
);

assert.strictEqual(
  shouldBlock('https://google.com', rules),
  false
);

assert.strictEqual(
  shouldBlock('https://www.reddit.com/r/javascript', rules),
  'contains:reddit'
);

assert.strictEqual(
  shouldBlock('https://news.ycombinator.com/item?id=1', rules),
  'regex:^https://news\\.ycombinator\\.com'
);

const decoded = decodeGoogleUrl(
  'https://www.google.com/url?q=https://www.reddit.com/r/test&sa=U&ved=0'
);
assert.strictEqual(decoded, 'https://www.reddit.com/r/test');

console.log('All utils tests passed.');
