// ABOUTME: Provides URL normalization and rule matching for the extension.
// ABOUTME: Exposes helpers for parsing rules and validating regex patterns.
const BlockerRules = (() => {
  const regexPrefix = 'regex:';
  const containsPrefix = 'contains:';

  const parseUrl = (rawUrl) => {
    if (!rawUrl) {
      return null;
    }
    try {
      return new URL(rawUrl, 'https://www.google.com');
    } catch (error) {
      return null;
    }
  };

  const isGoogleHost = (host) => /(^|\.)google\./.test(host);

  const decodeGoogleUrl = (rawUrl) => {
    const url = parseUrl(rawUrl);
    if (!url) {
      return rawUrl;
    }

    if (!isGoogleHost(url.hostname)) {
      return url.href;
    }

    const paramKeys = ['q', 'url', 'imgurl', 'imgrefurl'];
    for (const key of paramKeys) {
      const value = url.searchParams.get(key);
      if (value) {
        return value;
      }
    }

    return url.href;
  };

  const normalizeForMatch = (rawUrl) => {
    const decoded = decodeGoogleUrl(rawUrl);
    const url = parseUrl(decoded);
    if (!url) {
      return null;
    }
    return url.href;
  };

  const normalizeHost = (rawUrl) => {
    const decoded = decodeGoogleUrl(rawUrl);
    const url = parseUrl(decoded);
    return url ? url.hostname : null;
  };

  const hasNestedQuantifier = (pattern) => {
    const nested = /\([^)]*(?:\*|\+|\{\d+,?\d*\})[^)]*\)(?:\*|\+|\{\d+,?\d*\})/;
    return nested.test(pattern);
  };

  const hasBackreference = (pattern) => /\\\d/.test(pattern);

  const validateRegexPattern = (pattern) => {
    if (!pattern) {
      return { valid: false, reason: 'empty' };
    }
    if (pattern.length > 200) {
      return { valid: false, reason: 'too-long' };
    }
    if (hasNestedQuantifier(pattern)) {
      return { valid: false, reason: 'nested-quantifier' };
    }
    if (hasBackreference(pattern)) {
      return { valid: false, reason: 'backreference' };
    }
    try {
      new RegExp(pattern);
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'invalid-regex' };
    }
  };

  const getDomainFromUrl = (rawUrl) => {
    const url = parseUrl(rawUrl);
    return url ? url.hostname : '';
  };

  const parseRuleLine = (line) => line.trim();

  const parseRulesFromText = (text) =>
    text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

  const ruleMatchesUrl = (normalizedUrl, rule, host) => {
    if (!normalizedUrl) {
      return false;
    }

    if (rule.startsWith(containsPrefix)) {
      const needle = rule.slice(containsPrefix.length);
      if (!needle) {
        return false;
      }
      return normalizedUrl.includes(needle);
    }

    if (rule.startsWith(regexPrefix)) {
      const pattern = rule.slice(regexPrefix.length);
      const validation = validateRegexPattern(pattern);
      if (!validation.valid) {
        return false;
      }
      const regex = new RegExp(pattern);
      return regex.test(normalizedUrl);
    }

    const ruleHost = rule.startsWith('*.') ? rule.slice(2) : rule;
    if (!ruleHost) {
      return false;
    }
    if (!host) {
      return false;
    }
    return host === ruleHost || host.endsWith(`.${ruleHost}`);
  };

  const shouldBlock = (rawUrl, rules) => {
    if (!rawUrl) {
      return false;
    }
    const normalizedUrl = normalizeForMatch(rawUrl);
    const host = normalizeHost(rawUrl);
    for (const rawRule of rules) {
      const rule = parseRuleLine(rawRule);
      if (!rule) {
        continue;
      }
      if (ruleMatchesUrl(normalizedUrl, rule, host)) {
        return rule;
      }
    }
    return false;
  };

  return {
    decodeGoogleUrl,
    getDomainFromUrl,
    parseRuleLine,
    parseRulesFromText,
    shouldBlock,
    validateRegexPattern,
  };
})();

if (typeof window !== 'undefined') {
  window.BlockerRules = BlockerRules;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlockerRules;
}
