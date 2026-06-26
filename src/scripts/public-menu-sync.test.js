import { describe, it, expect } from 'vitest';
import { buildNameMap } from './public-menu-sync.js';

const makePlate = (overrides) => ({
  id: 'plate_test',
  name: 'Test Plate',
  desc: 'test desc',
  price: 35,
  category: 'tacos',
  available: true,
  popular: false,
  ...overrides,
});

describe('buildNameMap', () => {
  it('maps plate names to plates by lowercased key', () => {
    const plates = [
      makePlate({ name: 'Chicken Tacos', price: 35 }),
      makePlate({ name: 'Chicken Pizza', price: 55 }),
    ];
    const map = buildNameMap(plates);
    expect(map.get('chicken tacos')).toBe(plates[0]);
    expect(map.get('chicken pizza')).toBe(plates[1]);
  });

  it('returns empty map for empty array', () => {
    expect(buildNameMap([]).size).toBe(0);
  });

  it('trims whitespace before lowercasing', () => {
    const plate = makePlate({ name: '  Margherita  ' });
    const map = buildNameMap([plate]);
    expect(map.get('margherita')).toBe(plate);
  });

  it('last write wins when names collide after normalisation', () => {
    const a = makePlate({ name: 'Taco', price: 30 });
    const b = makePlate({ name: 'taco', price: 99 });
    const map = buildNameMap([a, b]);
    // b was inserted second — it wins
    expect(map.get('taco')).toBe(b);
  });

  it('skips null / non-string-name entries without throwing', () => {
    const good = makePlate({ name: 'Good Plate' });
    const map = buildNameMap([null, { name: 42 }, good]);
    expect(map.get('good plate')).toBe(good);
    expect(map.size).toBe(1);
  });
});
