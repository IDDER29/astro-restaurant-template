# Cart UX Upgrade — Verification Report

**Date:** 2026-06-26
**Branch:** marmara-astro-rebuild
**File changed:** `src/scripts/menu-cart.js`

---

## Summary

Status: **PASS — all checks green**

- Vitest unit tests: 40/40 passed
- Astro build: 6 pages built, no errors
- Playwright E2E: 18/18 checks passed

---

## Vitest Results

```
Test Files  7 passed (7)
Tests       40 passed (40)
Duration    444ms
```

All existing tests (whatsapp, menu, public-menu-sync, public-catering-sync,
order-stages, qr-encode) continue to pass without modification.

---

## Astro Build

```
6 page(s) built in 612ms
```

Largest bundle: `hoisted.B5E0_ppT.js  37.29 kB │ gzip: 11.22 kB` (menu-cart.js included).
No bundler warnings or errors.

---

## Playwright E2E Results

Chromium: `/home/idder/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`
URL: `http://localhost:4399/menu/`

| # | Check | Result |
|---|---|---|
| 1 | add buttons present (≥4) | PASS |
| 2 | bar shows "2 items" after 2 adds | PASS |
| 3 | bar total contains "MAD" | PASS |
| 4 | badge shows "2" | PASS |
| 5 | mm-btn-pulse animation defined in injected CSS | PASS |
| 6 | sheet visible after tapping bar | PASS |
| 7 | sheet has mm-open class | PASS |
| 8 | sheet has 2 line items | PASS |
| 9 | qty increased to 2 (stepper +) | PASS |
| 10 | qty decreased back to 1 (stepper −) | PASS |
| 11 | 1 line item after remove (trash) | PASS |
| 12 | bar shows "1 item" after remove | PASS |
| 13 | send opens wa.me/212600000000 URL | PASS |
| 14 | WhatsApp text contains MAD total | PASS |
| 15 | sold-out (aria-disabled) card not added | PASS |
| 16 | bar visible under prefers-reduced-motion | PASS |
| 17 | bar not zero-height under prefers-reduced-motion | PASS |
| 18 | Escape key closes sheet | PASS |

**Total: 18/18 passed, 0 failed**

---

## Screenshots

- `/tmp/cart-desktop-bar.png` — 1280×800, collapsed cart bar with 2 items
- `/tmp/cart-desktop-sheet.png` — 1280×800, expanded cart sheet
- `/tmp/cart-mobile-bar.png` — 390×844, collapsed cart bar
- `/tmp/cart-mobile-sheet.png` — 390×844, expanded cart sheet (full-width, 80vh)

---

## Implementation Notes

- `#mm-cart-bar` id preserved (no breaking change for existing references)
- All DOM side effects injected from JS only (no .astro/.css files touched)
- `buildOrderUrl(cart, { phone: '212600000000' })` call preserved exactly
- Event delegation on `.scp0` preserved with sold-out guard
- Tab filtering logic unchanged; `resolveTabLabel` identical to prior version
- CSS injected via `<style id="mm-cart-css">` appended to `<head>`
- `prefers-reduced-motion` disables all transitions and keyframe animations
- `env(safe-area-inset-bottom)` applied to bar and sheet footer padding
- `playwright-core` removed from devDependencies after verification
