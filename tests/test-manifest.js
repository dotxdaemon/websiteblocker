// ABOUTME: Validates that manifest match patterns are Chrome-compatible.
// ABOUTME: Fails when manifest contains invalid wildcard host patterns.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const invalidWildcardPattern = /google\.\*/;

const collectPatterns = (patterns) => {
  if (!Array.isArray(patterns)) {
    return [];
  }

  return patterns;
};

const hostPermissions = collectPatterns(manifest.host_permissions);
const contentMatches = collectPatterns(
  manifest.content_scripts?.flatMap((script) => script.matches)
);

const allPatterns = [...hostPermissions, ...contentMatches];

allPatterns.forEach((pattern) => {
  assert.strictEqual(
    invalidWildcardPattern.test(pattern),
    false,
    `Invalid wildcard host pattern found: ${pattern}`
  );
});

console.log('Manifest match patterns are valid.');
