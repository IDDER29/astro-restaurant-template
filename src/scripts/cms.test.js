import { describe, it, expect } from 'vitest';
import { mergeContent, loadContent, saveContent, STORAGE_KEY } from './cms.js';

const defaults = { heroHeadline: 'Default', aboutStory: 'Story' };

describe('cms', () => {
  it('mergeContent applies only non-empty overrides', () => {
    expect(mergeContent(defaults, { heroHeadline: 'New' })).toEqual({ heroHeadline: 'New', aboutStory: 'Story' });
    expect(mergeContent(defaults, { heroHeadline: '   ' })).toEqual(defaults);
    expect(mergeContent(defaults, {})).toEqual(defaults);
  });
  it('loadContent returns defaults on missing/invalid', () => {
    const empty = { getItem: () => null };
    expect(loadContent(STORAGE_KEY, defaults, empty)).toEqual(defaults);
    const bad = { getItem: () => '{not json' };
    expect(loadContent(STORAGE_KEY, defaults, bad)).toEqual(defaults);
  });
  it('save then load round-trips', () => {
    const store = {}; const mem = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
    saveContent(STORAGE_KEY, { heroHeadline: 'Saved' }, mem);
    expect(loadContent(STORAGE_KEY, defaults, mem).heroHeadline).toBe('Saved');
  });
});
