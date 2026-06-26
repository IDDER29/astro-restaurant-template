# Interactivity Implementation Report

## Deliverables

### `src/scripts/menu-cart.js`
- Imports `menu.json` and `site.json` for item/category lookup; imports `buildOrderUrl` from `whatsapp.js`.
- Discovers all menu cards via `image-slot[id^="mphoto-"]`; resolves item data from the id suffix.
- Attaches click handlers to each card's `.scp0` "+" button; builds an in-memory cart (increment qty on repeat).
- Creates and appends a fixed bottom cart bar (`rgb(24,20,16)` dark bg, white text) showing item count + total MAD, a green "Send order on WhatsApp" button (`rgb(37,211,102)`), and a "Clear" button.  Bar is hidden (`display:none`) when cart is empty.
- "Send" opens `buildOrderUrl(cart, {phone:'212600000000'})` in a new tab.
- Tab filtering: detects category tabs by matching inline style attributes (`cursor:pointer`, `font-weight:700`, `font-size:15px`, `padding:10px 20px`, `border-radius:999px`). On click: updates active/inactive tab colors, shows/hides cards by category key, and — when cards live in multiple parent grids (menu page) — hides any section whose cards are all hidden. Handles unmapped tab labels as a no-op.
- Only initialises cart and tab logic when `image-slot[id^="mphoto-"]` elements are present.

### `src/scripts/catering-quote.js`
- Finds the "Send my request on WhatsApp" `<a>` link; intercepts its click, prevents default navigation.
- Gathers: name (text input), event type (select), people count (range input), selected food chips, date, time, notes (textarea).
- Builds a readable plain-text message and opens `buildContactUrl('212600000000', message)` in a new tab.
- Food-type chips are toggleable (click toggles orange/white style); initial selected state is read from the existing HTML inline styles.
- Live estimate: range input updates both the people-count display (`~N`) and the estimate span (`~N×45 MAD`).

### Page integrations
- `src/pages/menu.astro` — added `<script>import '../scripts/menu-cart.js';</script>`
- `src/pages/index.astro` — added `<script>import '../scripts/menu-cart.js';</script>`
- `src/pages/catering.astro` — added `<script>import '../scripts/catering-quote.js';</script>`

## Verification

### `npm run build`
```
6 page(s) built in ~400ms — 0 errors
```

### `npm test`
```
4 test files, 10 tests — all passed
```

### Playwright (15/15)
```
── Menu page ──
  ✓ Cart bar starts hidden
  ✓ Cart bar appears after adding item
  ✓ Cart count = "1 item"
  ✓ Total includes "35 MAD"
  ✓ Burger card (double) visible after Burgers tab
  ✓ Tacos card (ctacos) hidden after Burgers tab
  ✓ Breakfast section hidden after Burgers tab
  ✓ Burgers tab has dark background
  ✓ All tab has white background

── Home page ──
  ✓ Cart bar starts hidden
  ✓ Cart bar appears after adding item
  ✓ Total "35 MAD"

── Catering page ──
  ✓ URL starts with https://wa.me/212600000000?text=
  ✓ Message contains "Test User"
  ✓ Message contains "Marmara"

Results: 15 passed, 0 failed
```

## Design constraint
No `src/raw/*.html` files were modified. All interactivity is additive JavaScript layered on top of the existing DOM.
