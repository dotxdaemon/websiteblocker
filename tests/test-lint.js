// ABOUTME: Enforces required ABOUTME headers in JavaScript files.
// ABOUTME: Scans repository source files to ensure header compliance.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const scanDirs = [rootDir, path.join(rootDir, 'tests')];

const isJavaScriptFile = (filePath) => filePath.endsWith('.js');

const collectFiles = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  entries.forEach((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return;
    }
    if (isJavaScriptFile(fullPath)) {
      files.push(fullPath);
    }
  });
  return files;
};

const checkAboutMe = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const firstLine = lines[0] || '';
  const secondLine = lines[1] || '';
  assert.ok(
    firstLine.startsWith('// ABOUTME: '),
    `Missing ABOUTME header line 1 in ${path.relative(rootDir, filePath)}`
  );
  assert.ok(
    secondLine.startsWith('// ABOUTME: '),
    `Missing ABOUTME header line 2 in ${path.relative(rootDir, filePath)}`
  );
};

const files = scanDirs.flatMap((dirPath) => collectFiles(dirPath));
files.forEach((filePath) => {
  checkAboutMe(filePath);
});

console.log('Lint tests passed.');
