// ABOUTME: Performs syntax checks for JavaScript files in the project.
// ABOUTME: Runs Node syntax validation to catch parse errors early.
const assert = require('assert');
const { execSync } = require('child_process');
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

const checkSyntax = (filePath) => {
  try {
    execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
  } catch (error) {
    throw new assert.AssertionError({
      message: `Syntax check failed for ${path.relative(rootDir, filePath)}`,
    });
  }
};

const files = scanDirs.flatMap((dirPath) => collectFiles(dirPath));
files.forEach((filePath) => {
  checkSyntax(filePath);
});

console.log('Typecheck tests passed.');
