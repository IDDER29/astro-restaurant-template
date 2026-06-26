import { describe, it, expect } from 'vitest';
import { buildOrderUrl, buildContactUrl } from './whatsapp.js';

describe('buildOrderUrl', () => {
  it('builds a wa.me url with stripped phone digits and encoded order lines', () => {
    const url = buildOrderUrl(
      [{ name: 'Chicken Tacos', qty: 2, price: 35 }, { name: 'Orange Press', qty: 1, price: 15 }],
      { phone: '+212 6 00 00 00 00' }
    );
    expect(url.startsWith('https://wa.me/212600000000?text=')).toBe(true);
    const text = decodeURIComponent(url.split('text=')[1]);
    expect(text).toContain('2x Chicken Tacos');
    expect(text).toContain('1x Orange Press');
    expect(text).toContain('85 MAD'); // total 2*35 + 15
  });
  it('uses a default intro greeting', () => {
    const text = decodeURIComponent(buildOrderUrl([{ name: 'Margherita', qty: 1, price: 45 }], { phone: '212600000000' }).split('text=')[1]);
    expect(text.toLowerCase()).toContain('marmara');
  });
});

describe('buildContactUrl', () => {
  it('encodes a plain message to wa.me', () => {
    const url = buildContactUrl('212600000000', "Hi Marmara! I'd like to order.");
    expect(url).toBe('https://wa.me/212600000000?text=' + encodeURIComponent("Hi Marmara! I'd like to order."));
  });
});
