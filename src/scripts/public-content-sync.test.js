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

  it('returns object with promoOn: false when stored as false', () => {
    const obj = { promoText: 'Student night', promoOn: false };
    const result = parseSiteContent(JSON.stringify(obj));
    expect(result).not.toBe(null);
    expect(result.promoOn).toBe(false);
  });

  it('returns object with promoOn: true when stored as true', () => {
    const obj = { promoText: 'Student night', promoOn: true };
    const result = parseSiteContent(JSON.stringify(obj));
    expect(result).not.toBe(null);
    expect(result.promoOn).toBe(true);
  });

  it('promoOn is undefined (default on) when absent from stored content', () => {
    const obj = { promoText: 'Student night' };
    const result = parseSiteContent(JSON.stringify(obj));
    expect(result).not.toBe(null);
    expect(result.promoOn).toBeUndefined();
    // promoOn undefined means "on" — content.promoOn !== false is true
    expect(result.promoOn !== false).toBe(true);
  });
});
