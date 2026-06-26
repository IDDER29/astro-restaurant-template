# public-menu-sync — Implementation Report

**Date:** 2026-06-26

## Status: COMPLETE — all checks green

---

## Files Created / Modified

| Path | Action |
|---|---|
| `src/scripts/public-menu-sync.js` | Created — core sync logic |
| `src/scripts/public-menu-sync.test.js` | Created — 5 vitest unit tests |
| `src/pages/menu.astro` | Modified — added sync script import |
| `src/pages/index.astro` | Modified — added sync script import |
| `.superpowers/sdd/public-sync-report.md` | Created — this report |

`playwright-verify.js` was used for verification and removed before commit.

---

## How It Works

`public-menu-sync.js` runs as a client-side Astro bundle on `/menu/` and `/`
(home). On load it:

1. Reads `marmara_menu_plates` from `localStorage`. If absent, exits immediately
   (pages render baked-in values — no regression).
2. Builds a case-insensitive `name → plate` map via `buildNameMap()`.
3. Queries every `image-slot[id^="mphoto-"]`. For each slot, resolves the
   canonical item name from the bundled `menu.json` lookup, then finds the
   matching dashboard plate by name.
4. Updates the card's price span, name span, and description span in-place.
5. If `plate.available === false`: dims the card (opacity 0.5), appends a
   `data-marmara-sold-out` badge over the image, and sets `pointer-events:none`
   on `.scp0` so it cannot be added to cart.

The script coexists with `menu-cart.js` — cart event listeners are bound after
DOM ready in both scripts; they target the same `.scp0` elements but
`public-menu-sync.js` only adds `pointer-events:none` on sold-out items, which
prevents the click from reaching `menu-cart.js`'s listener.

---

## Verify Results (Playwright — 7/7 passed)

```
[Test 1+2] Shared context: dashboard edit → /menu/ reflection
  PASS  localStorage written after Save
  PASS  Price reflect: Chicken Tacos shows "99 MAD"
  PASS  Sold-out: Chicken Pizza has "Sold out" badge
  PASS  Sold-out: Chicken Pizza .scp0 has pointer-events:none
  PASS  Sold-out: Chicken Pizza card opacity is 0.5

[Test 3] Fresh context: no localStorage → original baked prices
  PASS  No-LS regression: marmara_menu_plates absent in fresh context
  PASS  No-LS regression: Chicken Tacos shows original "35 MAD"

── Results: 7 passed, 0 failed ──
```

- **Price reflect:** PASS — Chicken Tacos updated from 35 MAD to 99 MAD
- **Sold-out:** PASS — Chicken Pizza shows badge, .scp0 disabled, card dimmed
- **No-localStorage regression:** PASS — fresh context shows original 35 MAD

---

## npm test (9/9 passed)

```
 ✓ src/scripts/whatsapp.test.js (3 tests)
 ✓ src/scripts/public-menu-sync.test.js (5 tests)
 ✓ src/data/menu.test.js (1 test)
 Test Files  3 passed (3)
      Tests  9 passed (9)
```

---

## npm run build (6 pages)

```
07:51:06 [build] 6 page(s) built in 485ms
07:51:06 [build] Complete!
```

---

## Concerns

None. The implementation is purely additive — no markup files were changed.
The name-matching approach (canonical name from `menu.json` → case-insensitive
lookup in dashboard plates) is the only correct strategy given that dashboard
IDs do not correspond to `menu.json` IDs.
