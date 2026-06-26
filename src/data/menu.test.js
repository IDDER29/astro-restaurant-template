import { describe, it, expect } from 'vitest';
import menu from './menu.json';
import site from './site.json';

describe('menu data', () => {
  it('has 34 items with required fields', () => {
    expect(menu.length).toBe(34);
    for (const m of menu) {
      expect(typeof m.id).toBe('string');
      expect(typeof m.name).toBe('string');
      expect(typeof m.price).toBe('number');
      expect(typeof m.popular).toBe('boolean');
      expect(site.categories.some((c) => c.key === m.category)).toBe(true);
    }
  });
});
