import { describe, it, expect } from 'vitest';
import { generateQrSvg, generateQrPng } from './qr-encode.js';

describe('generateQrSvg', () => {
  it('returns a string starting with <svg', () => {
    const svg = generateQrSvg('hello');
    expect(typeof svg).toBe('string');
    expect(svg.startsWith('<svg')).toBe(true);
  });

  it('contains <rect elements for dark modules', () => {
    const svg = generateQrSvg('hello');
    expect(svg).toContain('<rect');
  });

  it('encodes a typical menu URL without error', () => {
    const svg = generateQrSvg('http://localhost:4399/menu');
    expect(svg.length).toBeGreaterThan(0);
    expect(svg.startsWith('<svg')).toBe(true);
  });

  it('produces different output for different inputs', () => {
    const a = generateQrSvg('hello');
    const b = generateQrSvg('world');
    expect(a).not.toBe(b);
  });

  it('SVG has correct viewBox dimensions (multiple of module grid)', () => {
    const svg = generateQrSvg('hi');
    const match = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    expect(match).not.toBeNull();
    const w = parseInt(match[1]);
    const h = parseInt(match[2]);
    expect(w).toBe(h); // square QR
    expect(w).toBeGreaterThan(20); // at least v1 size (21) + quiet zone
  });

  it('same input always produces same output (deterministic)', () => {
    const url = 'https://marmara-benguerir.ma/menu';
    expect(generateQrSvg(url)).toBe(generateQrSvg(url));
  });

  it('uses the fg color in dark modules', () => {
    const svg = generateQrSvg('test', { fg: '#ff0000' });
    expect(svg).toContain('#ff0000');
  });

  it('respects the bg color for background rect', () => {
    const svg = generateQrSvg('test', { bg: '#fffde7' });
    expect(svg).toContain('#fffde7');
  });
});

describe('generateQrPng', () => {
  it('returns empty string in Node (no document)', async () => {
    const result = await generateQrPng('hello');
    expect(result).toBe('');
  });
});
