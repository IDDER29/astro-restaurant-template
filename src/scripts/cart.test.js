import { describe, it, expect } from 'vitest';
import { addItem, removeItem, cartTotal, cartCount } from './cart.js';

const taco = { id: 'ctacos', name: 'Chicken Tacos', price: 35 };

describe('cart', () => {
  it('adds and increments by id', () => {
    let c = addItem([], taco);
    c = addItem(c, taco);
    expect(c).toEqual([{ id: 'ctacos', name: 'Chicken Tacos', price: 35, qty: 2 }]);
  });
  it('removes/decrements and drops at zero', () => {
    let c = addItem(addItem([], taco), taco); // qty 2
    c = removeItem(c, 'ctacos');
    expect(cartCount(c)).toBe(1);
    c = removeItem(c, 'ctacos');
    expect(c).toEqual([]);
  });
  it('totals and counts', () => {
    const c = addItem(addItem([], taco), { id: 'op', name: 'Orange Press', price: 15 });
    expect(cartTotal(c)).toBe(50);
    expect(cartCount(c)).toBe(2);
  });
});
