import { describe, it, expect } from 'vitest';
import { parseCateringPackages } from './public-catering-sync.js';

describe('parseCateringPackages', () => {
  it('returns null for null input', () => {
    expect(parseCateringPackages(null)).toBe(null);
  });

  it('returns null for malformed JSON', () => {
    expect(parseCateringPackages('{ not valid')).toBe(null);
  });

  it('returns null for valid JSON that is not an array', () => {
    expect(parseCateringPackages('{"name":"test"}')).toBe(null);
  });

  it('returns the parsed array for valid JSON array', () => {
    const pkgs = [{ name: 'Study Boost', price: '280', serves: '~10', featured: false, lines: [] }];
    expect(parseCateringPackages(JSON.stringify(pkgs))).toEqual(pkgs);
  });

  it('returns empty array for empty JSON array', () => {
    expect(parseCateringPackages('[]')).toEqual([]);
  });
});
