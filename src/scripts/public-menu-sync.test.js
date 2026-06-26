import { describe, it, expect } from 'vitest';
import { buildNameMap, filterNewPlates } from './public-menu-sync.js';

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

describe('filterNewPlates', () => {
  it('returns plates whose names are not in bakedNameSet', () => {
    const plates = [
      makePlate({ name: 'Chicken Tacos', id: 'ctacos' }),
      makePlate({ name: 'Test Tajine', id: 'plate_test_1' }),
    ];
    const baked = new Set(['chicken tacos']);
    const result = filterNewPlates(plates, baked);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Tajine');
  });

  it('returns empty array when all plates are in baked set', () => {
    const plates = [makePlate({ name: 'Chicken Tacos', id: 'ctacos' })];
    const baked = new Set(['chicken tacos']);
    expect(filterNewPlates(plates, baked)).toHaveLength(0);
  });

  it('returns all plates when baked set is empty', () => {
    const plates = [
      makePlate({ name: 'Foo', id: 'plate_1' }),
      makePlate({ name: 'Bar', id: 'plate_2' }),
    ];
    expect(filterNewPlates(plates, new Set())).toHaveLength(2);
  });

  it('handles null and invalid entries without throwing', () => {
    const good = makePlate({ name: 'Good Plate', id: 'plate_good' });
    const result = filterNewPlates([null, { name: 42 }, good], new Set());
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Good Plate');
  });

  it('does case-insensitive comparison', () => {
    const plates = [makePlate({ name: 'CHICKEN TACOS', id: 'ctacos' })];
    const baked = new Set(['chicken tacos']);
    expect(filterNewPlates(plates, baked)).toHaveLength(0);
  });

  it('trims whitespace before comparing', () => {
    const plates = [makePlate({ name: '  Chicken Tacos  ', id: 'ctacos' })];
    const baked = new Set(['chicken tacos']);
    expect(filterNewPlates(plates, baked)).toHaveLength(0);
  });

  it('returns empty array for non-array input', () => {
    expect(filterNewPlates(null, new Set())).toHaveLength(0);
    expect(filterNewPlates(undefined, new Set())).toHaveLength(0);
    expect(filterNewPlates('not an array', new Set())).toHaveLength(0);
  });
});
