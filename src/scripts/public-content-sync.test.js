import { describe, it, expect } from 'vitest';
import { parseSiteContent } from './public-content-sync.js';

describe('parseSiteContent', () => {
  it('returns null for null input', () => {
    expect(parseSiteContent(null)).toBe(null);
  });

  it('returns null for malformed JSON string', () => {
    expect(parseSiteContent('{ not valid json')).toBe(null);
  });

  it('returns the parsed object for valid JSON', () => {
    const obj = { heroBadge: 'New', heroHeadline: 'Welcome' };
    const result = parseSiteContent(JSON.stringify(obj));
    expect(result).toEqual(obj);
  });

  it('returns null for valid JSON that is not an object (e.g. a number)', () => {
    expect(parseSiteContent('42')).toBe(null);
  });
});
