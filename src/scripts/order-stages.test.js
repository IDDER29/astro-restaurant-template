import { describe, it, expect } from 'vitest';
import { buildStagesObject } from './order-stages.js';

describe('buildStagesObject', () => {
  it('maps 4-element array to index-keyed object', () => {
    expect(buildStagesObject(['A', 'B', 'C', 'D'])).toEqual({ 0: 'A', 1: 'B', 2: 'C', 3: 'D' });
  });

  it('returns empty object for empty array', () => {
    expect(buildStagesObject([])).toEqual({});
  });

  it('handles single-element array', () => {
    expect(buildStagesObject(['X'])).toEqual({ 0: 'X' });
  });
});
