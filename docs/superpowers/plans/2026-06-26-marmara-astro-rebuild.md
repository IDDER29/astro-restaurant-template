# Marmara Astro Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the single-file Marmara restaurant bundle as a clean, componentized Astro static site that looks identical to visitors, deploys free to a live URL, and reads as a professional portfolio repo.

**Architecture:** Astro static site. Shared `BaseLayout` + `Nav`/`Footer` components. All dish data in `src/data/menu.json`, all site copy/contact in `src/data/site.json`. Pure logic (cart math, WhatsApp URL building, localStorage CMS merge) lives in `src/scripts/*.js` as framework-free, unit-tested modules consumed by small client islands. The owner dashboard keeps `localStorage` persistence (demo-grade).

**Tech Stack:** Astro 4.x, Node 18+, Vitest (unit tests), vanilla JS islands, plain CSS with design tokens. No UI framework. Free static host (Cloudflare Pages or Netlify).

## Global Constraints

- Node 18+ required. Package manager: npm.
- Brand tokens (verbatim): orange `#FF8A1E`, ink `#181410`, cream `#FFFBF4`; accents tacos `#76C043`, sandwiches `#FF3B5C`, burgers `#8B43E0`, breakfast `#FF8A1E`.
- Heading font: Bricolage Grotesque (weights 600/700/800). Body: system sans stack.
- Contact placeholders kept verbatim (the owner swaps later): WhatsApp `212600000000`, phone display `+212 6 00 00 00 00`, Instagram handle `marmara.fruits`, address `123 Avenue Hassan II, Ben Guerir 43150, Morocco`, hours `9:00 AM – 1:00 AM` daily, Maps query `Marmara Restaurant Ben Guerir`.
- Site is fully static (`output: 'static'`). No server runtime, no backend.
- Every page uses `BaseLayout`. No `<head>`/nav/footer duplication across pages.
- Commit after every task. Conventional commit messages.

---

### Task 1: Scaffold Astro project + tooling

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `src/pages/index.astro` (temporary placeholder)

**Interfaces:**
- Produces: a runnable Astro dev server and `npm test` wired to Vitest.

- [ ] **Step 1: Initialize project files**

`package.json`:
```json
{
  "name": "marmara-benguerir",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run"
  },
  "dependencies": { "astro": "^4.15.0" },
  "devDependencies": { "vitest": "^2.0.0" }
}
```

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
export default defineConfig({ output: 'static', site: 'https://marmara-benguerir.pages.dev' });
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['src/**/*.test.{js,ts}'] } });
```

`.gitignore`:
```
node_modules/
dist/
.astro/
```

`tsconfig.json`:
```json
{ "extends": "astro/tsconfigs/strict" }
```

`src/pages/index.astro`:
```astro
<h1>Marmara — placeholder</h1>
```

- [ ] **Step 2: Install and verify build**

Run: `npm install && npm run build`
Expected: build completes, `dist/index.html` created.

- [ ] **Step 3: Verify test runner**

Run: `npm test`
Expected: Vitest runs, reports "No test files found" (exit 0) — runner is wired.

- [ ] **Step 4: Commit**

```bash
git add package.json astro.config.mjs tsconfig.json vitest.config.ts .gitignore src/pages/index.astro
git commit -m "chore: scaffold Astro project with Vitest"
```

---

### Task 2: WhatsApp order URL builder (pure module, TDD)

**Files:**
- Create: `src/scripts/whatsapp.js`
- Test: `src/scripts/whatsapp.test.js`

**Interfaces:**
- Produces:
  - `buildOrderUrl(cart, opts)` → string. `cart` is `Array<{name, qty, price}>`; `opts` is `{ phone: string, intro?: string }`. Returns `https://wa.me/<digits>?text=<encoded>`.
  - `buildContactUrl(phone, message)` → string.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- whatsapp`
Expected: FAIL — module not found / functions undefined.

- [ ] **Step 3: Write minimal implementation**

```js
// src/scripts/whatsapp.js
const digits = (phone) => String(phone).replace(/[^0-9]/g, '');

export function buildOrderUrl(cart, { phone, intro = 'Hi Marmara! I’d like to order:' } = {}) {
  const lines = cart.map((i) => `${i.qty}x ${i.name}`);
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const text = `${intro}\n${lines.join('\n')}\n\nTotal: ${total} MAD`;
  return `https://wa.me/${digits(phone)}?text=${encodeURIComponent(text)}`;
}

export function buildContactUrl(phone, message) {
  return `https://wa.me/${digits(phone)}?text=${encodeURIComponent(message)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- whatsapp`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/whatsapp.js src/scripts/whatsapp.test.js
git commit -m "feat: WhatsApp order URL builder with tests"
```

---

### Task 3: Cart logic (pure module, TDD)

**Files:**
- Create: `src/scripts/cart.js`
- Test: `src/scripts/cart.test.js`

**Interfaces:**
- Produces:
  - `addItem(cart, item)` → new cart array (increments qty if `id` present).
  - `removeItem(cart, id)` → new cart array (decrements; drops at qty 0).
  - `cartTotal(cart)` → number. `cartCount(cart)` → number.
  - Cart item shape: `{ id, name, price, qty }`.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cart`
Expected: FAIL — functions undefined.

- [ ] **Step 3: Write minimal implementation**

```js
// src/scripts/cart.js
export function addItem(cart, item) {
  const found = cart.find((i) => i.id === item.id);
  if (found) return cart.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
  return [...cart, { id: item.id, name: item.name, price: item.price, qty: 1 }];
}
export function removeItem(cart, id) {
  return cart
    .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
    .filter((i) => i.qty > 0);
}
export const cartTotal = (cart) => cart.reduce((s, i) => s + i.qty * i.price, 0);
export const cartCount = (cart) => cart.reduce((s, i) => s + i.qty, 0);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cart`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/cart.js src/scripts/cart.test.js
git commit -m "feat: cart add/remove/total logic with tests"
```

---

### Task 4: Data files (menu + site)

**Files:**
- Modify: `src/data/menu.json` (already staged — verify it has 34 items)
- Create: `src/data/site.json`
- Create: `src/data/menu.test.js`

**Interfaces:**
- Produces:
  - `menu.json`: `Array<{ id, name, desc, price:number, category, popular:boolean }>`.
  - `site.json`: `{ name, tagline, whatsapp, phoneDisplay, instagram, address, mapsQuery, hours, categories: Array<{key,label}>, stats, hero, about }`.

- [ ] **Step 1: Verify menu.json is present and well-formed (write failing test first)**

```js
// src/data/menu.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- menu`
Expected: FAIL — `site.json` not found.

- [ ] **Step 3: Create `src/data/site.json`**

```json
{
  "name": "Marmara",
  "tagline": "Tacos, burgers & fresh juice.",
  "whatsapp": "212600000000",
  "phoneDisplay": "+212 6 00 00 00 00",
  "instagram": "marmara.fruits",
  "address": "123 Avenue Hassan II, Ben Guerir 43150, Morocco",
  "mapsQuery": "Marmara Restaurant Ben Guerir",
  "hours": { "open": "9:00 AM", "close": "1:00 AM", "note": "Every day" },
  "categories": [
    { "key": "breakfast", "label": "Breakfast" },
    { "key": "sandwiches", "label": "Sandwiches & Paninis" },
    { "key": "tacos", "label": "Moroccan Tacos" },
    { "key": "burgers", "label": "Burgers" },
    { "key": "pizza", "label": "Pizza" },
    { "key": "pasta", "label": "Pasta" },
    { "key": "salads", "label": "Salads" },
    { "key": "crepes", "label": "Crepes" },
    { "key": "drinks", "label": "Juices & Drinks" }
  ],
  "stats": [
    { "value": "30+", "label": "menu items" },
    { "value": "1 AM", "label": "open every day" },
    { "value": "2 min", "label": "from UM6P campus" },
    { "value": "4.9", "label": "local rating" }
  ],
  "hero": {
    "badge": "Ben Guerir · Open until 1:00 AM",
    "headline": "Tacos, burgers & fresh juice.",
    "sub": "Sandwiches, Moroccan tacos, burgers, pizza, breakfast & cold-pressed juice — made fresh to order. Dine in, takeaway or delivery, two minutes from UM6P. Open till 1 AM."
  },
  "about": {
    "story": "Marmara started with one idea: that great food in Ben Guerir should be easy to grab — whether it’s breakfast before class or a burger long after midnight. Sandwiches, tacos, burgers, pizza, fresh salads and cold-pressed juice, all made to order. Dine in, take away, or have it delivered.",
    "beliefHeading": "Walking past at night, you should want to come in.",
    "beliefBody": "Warm, bright, alive — the smell of fresh food and the glow of the counter. That feeling is what we want the whole experience to be. Whether you find us on the street or on your phone, ordering should feel just as quick and just as inviting. The food is the product. The ease of getting it is the promise."
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- menu`
Expected: PASS. If menu.json count ≠ 34, re-extract from the source bundle with the documented script (see Appendix A) before proceeding.

- [ ] **Step 5: Commit**

```bash
git add src/data/menu.json src/data/site.json src/data/menu.test.js
git commit -m "feat: menu and site content data files"
```

---

### Task 5: Design tokens + global CSS

**Files:**
- Create: `src/styles/global.css`

**Interfaces:**
- Produces: CSS custom properties consumed by every component: `--orange`, `--ink`, `--cream`, `--acc-tacos`, `--acc-sandwiches`, `--acc-burgers`, `--font-head`; base reset; `.container`, `.btn`, `.btn-primary` utility classes.

- [ ] **Step 1: Write global.css**

```css
:root{
  --orange:#FF8A1E; --ink:#181410; --cream:#FFFBF4;
  --acc-tacos:#76C043; --acc-sandwiches:#FF3B5C; --acc-burgers:#8B43E0; --acc-breakfast:#FF8A1E;
  --font-head:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,sans-serif;
  --font-body:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:var(--cream);color:var(--ink);font-family:var(--font-body);line-height:1.5}
h1,h2,h3{font-family:var(--font-head);font-weight:800;line-height:1.05}
.container{max-width:1100px;margin:0 auto;padding:0 20px}
a{color:inherit;text-decoration:none}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:999px;font-weight:700;cursor:pointer;border:0}
.btn-primary{background:var(--orange);color:#fff}
.btn-ghost{background:transparent;border:1.5px solid rgba(24,20,16,.15)}
img{max-width:100%;display:block}
```

- [ ] **Step 2: Add Bricolage Grotesque via Google Fonts in BaseLayout (deferred to Task 6) — note only**

(No action; documented so Task 6 includes the font `<link>`.)

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: design tokens and global styles"
```

---

### Task 6: BaseLayout with SEO/meta + Nav + Footer

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/Nav.astro`
- Create: `src/components/Footer.astro`

**Interfaces:**
- Consumes: `site.json`; `buildContactUrl` from `src/scripts/whatsapp.js`.
- Produces: `BaseLayout` props `{ title:string, description:string, ogImage?:string }` with a default slot for page content. `Nav` and `Footer` take no props (read `site.json`).

- [ ] **Step 1: Create Nav.astro**

```astro
---
import site from '../data/site.json';
const links = [
  { href: '/', label: 'Home' }, { href: '/menu', label: 'Menu' },
  { href: '/catering', label: 'Catering' }, { href: '/about', label: 'About' },
  { href: '/visit', label: 'Visit' },
];
const wa = `https://wa.me/${site.whatsapp}`;
---
<header class="nav"><div class="container nav-in">
  <a href="/" class="brand">Marmara</a>
  <nav>{links.map((l) => <a href={l.href}>{l.label}</a>)}</nav>
  <a class="btn btn-primary" href={wa}>Order on WhatsApp</a>
</div></header>
<style>
  .nav{position:sticky;top:0;z-index:50;background:rgba(255,251,244,.9);backdrop-filter:blur(8px);border-bottom:1px solid rgba(24,20,16,.06)}
  .nav-in{display:flex;align-items:center;gap:20px;height:64px}
  .brand{font-family:var(--font-head);font-weight:800;font-size:22px}
  nav{display:flex;gap:18px;margin-left:auto}
  @media(max-width:720px){nav{display:none}}
</style>
```

- [ ] **Step 2: Create Footer.astro**

```astro
---
import site from '../data/site.json';
---
<footer class="ft"><div class="container ft-in">
  <div>
    <div class="brand">Marmara</div>
    <p>Sandwiches, tacos, burgers, pizza & fresh juice in Ben Guerir. Dine in, takeaway or delivery — open till 1 AM.</p>
  </div>
  <div>
    <strong>Pages</strong>
    <a href="/menu">Menu</a><a href="/catering">Catering</a><a href="/about">About</a><a href="/visit">Visit</a>
  </div>
  <div>
    <strong>Find us</strong>
    <a href={`https://wa.me/${site.whatsapp}`}>WhatsApp</a>
    <a href={`https://instagram.com/${site.instagram}`}>Instagram</a>
    <a href={`https://maps.google.com/?q=${encodeURIComponent(site.mapsQuery)}`}>Google Maps</a>
    <p>{site.address} · {site.hours.open}–{site.hours.close} daily</p>
    <a href="/dashboard">Owner login</a>
  </div>
</div></footer>
<style>
  .ft{background:var(--ink);color:#fff;margin-top:60px}
  .ft-in{display:grid;grid-template-columns:2fr 1fr 1fr;gap:30px;padding:40px 20px}
  .ft a{display:block;opacity:.8;margin-top:6px}
  @media(max-width:720px){.ft-in{grid-template-columns:1fr}}
</style>
```

- [ ] **Step 3: Create BaseLayout.astro**

```astro
---
import '../styles/global.css';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
const { title, description, ogImage = '/og-image.png' } = Astro.props;
---
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&display=swap" rel="stylesheet" />
</head>
<body>
  <Nav />
  <main><slot /></main>
  <Footer />
</body>
</html>
```

- [ ] **Step 4: Build to verify layout compiles**

Run: `npm run build`
Expected: build succeeds (index.astro still placeholder — that's fine).

- [ ] **Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/Nav.astro src/components/Footer.astro
git commit -m "feat: BaseLayout with SEO/meta, shared Nav and Footer"
```

---

### Task 7: Menu page + cart/WhatsApp ordering island

**Files:**
- Create: `src/components/MenuCard.astro`
- Create: `src/components/CartDrawer.astro`
- Create: `src/scripts/menu-island.js`
- Modify: `src/pages/menu.astro` (create)

**Interfaces:**
- Consumes: `menu.json`, `site.json`, `cart.js` (`addItem`/`removeItem`/`cartTotal`/`cartCount`), `whatsapp.js` (`buildOrderUrl`).
- Produces: `/menu` page with category sections, `+`/`–` controls wired to a sticky cart that opens a `wa.me` order. `MenuCard` props `{ item }`.

- [ ] **Step 1: Create MenuCard.astro**

```astro
---
const { item } = Astro.props;
const accent = { tacos:'var(--acc-tacos)', sandwiches:'var(--acc-sandwiches)', burgers:'var(--acc-burgers)' }[item.category] || 'var(--orange)';
---
<article class="card" data-id={item.id} data-name={item.name} data-price={item.price}>
  <div class="thumb" style={`--a:${accent}`}>{item.popular && <span class="pop">Popular</span>}</div>
  <div class="body">
    <h3>{item.name}</h3>
    <p class="desc">{item.desc}</p>
    <div class="row"><span class="price">{item.price} MAD</span>
      <button class="add" data-id={item.id} aria-label={`Add ${item.name}`}>+</button></div>
  </div>
</article>
<style>
  .card{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 1px 4px rgba(24,20,16,.06)}
  .thumb{height:120px;background:linear-gradient(135deg,var(--a),color-mix(in srgb,var(--a) 60%,#fff));position:relative}
  .pop{position:absolute;top:10px;left:10px;background:#fff;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700}
  .body{padding:14px}.desc{color:#7a736b;font-size:14px;margin:4px 0 12px}
  .row{display:flex;align-items:center;justify-content:space-between}
  .price{font-weight:800}.add{width:36px;height:36px;border-radius:50%;border:0;background:var(--orange);color:#fff;font-size:20px;cursor:pointer}
</style>
```

- [ ] **Step 2: Create CartDrawer.astro** (markup + mount point the island controls)

```astro
---
import site from '../data/site.json';
---
<div id="cart-bar" data-whatsapp={site.whatsapp} hidden>
  <span id="cart-count">0 items</span>
  <span id="cart-total">0 MAD</span>
  <button id="cart-send" class="btn btn-primary">Send order on WhatsApp</button>
  <button id="cart-clear" class="btn btn-ghost">Clear</button>
</div>
<style>
  #cart-bar{position:fixed;left:0;right:0;bottom:0;z-index:60;display:flex;gap:14px;align-items:center;justify-content:center;background:var(--ink);color:#fff;padding:14px 20px}
  #cart-bar[hidden]{display:none}
</style>
```

- [ ] **Step 3: Create menu-island.js** (browser glue using tested modules)

```js
import { addItem, removeItem, cartTotal, cartCount } from './cart.js';
import { buildOrderUrl } from './whatsapp.js';

let cart = [];
const bar = document.getElementById('cart-bar');
const countEl = document.getElementById('cart-count');
const totalEl = document.getElementById('cart-total');

function render() {
  const n = cartCount(cart);
  bar.hidden = n === 0;
  countEl.textContent = `${n} item${n === 1 ? '' : 's'}`;
  totalEl.textContent = `${cartTotal(cart)} MAD`;
}
document.querySelectorAll('.add').forEach((btn) => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.card');
    cart = addItem(cart, { id: card.dataset.id, name: card.dataset.name, price: Number(card.dataset.price) });
    render();
  });
});
document.getElementById('cart-clear').addEventListener('click', () => { cart = []; render(); });
document.getElementById('cart-send').addEventListener('click', () => {
  if (!cart.length) return;
  window.open(buildOrderUrl(cart, { phone: bar.dataset.whatsapp }), '_blank');
});
render();
```

- [ ] **Step 4: Create menu.astro**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import MenuCard from '../components/MenuCard.astro';
import CartDrawer from '../components/CartDrawer.astro';
import menu from '../data/menu.json';
import site from '../data/site.json';
const byCat = site.categories
  .map((c) => ({ ...c, items: menu.filter((m) => m.category === c.key) }))
  .filter((c) => c.items.length);
---
<BaseLayout title="Menu — Marmara, Ben Guerir" description="The full Marmara menu — sandwiches, Moroccan tacos, burgers, pizza, pasta, salads, crepes and fresh juice. Priced in MAD, order on WhatsApp.">
  <section class="container" style="padding:40px 20px">
    <h1>The full menu</h1>
    <p>Everything fresh, priced in MAD. Tap + to build your order and send it to WhatsApp in one tap. Pay cash or card on pickup.</p>
    {byCat.map((c) => (
      <section style="margin-top:32px">
        <h2>{c.label}</h2>
        <div class="grid">{c.items.map((item) => <MenuCard item={item} />)}</div>
      </section>
    ))}
  </section>
  <CartDrawer />
  <script>import '../scripts/menu-island.js';</script>
</BaseLayout>
<style>.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-top:14px}</style>
```

- [ ] **Step 5: Build + manual verify**

Run: `npm run build && npm run preview`
Expected: `/menu` lists 34 items in 9 sections; clicking `+` shows the cart bar with count/total; "Send order" opens a `wa.me` URL. Run `npm test` — all prior tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/MenuCard.astro src/components/CartDrawer.astro src/scripts/menu-island.js src/pages/menu.astro
git commit -m "feat: menu page with cart and WhatsApp ordering"
```

---

### Task 8: Home page

**Files:**
- Create: `src/components/SectionHeader.astro`, `src/components/StatRow.astro`, `src/components/QrBlock.astro`
- Modify: `src/pages/index.astro` (replace placeholder)

**Interfaces:**
- Consumes: `site.json`, `menu.json` (for popular items), components above.
- Produces: home page sections — hero, promo strip, "order ahead" steps, popular picks, hours/location teaser, QR section, stats.

- [ ] **Step 1: Create StatRow.astro**

```astro
---
import site from '../data/site.json';
---
<div class="stats">{site.stats.map((s) => (
  <div class="stat"><strong>{s.value}</strong><span>{s.label}</span></div>))}</div>
<style>
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:30px 0}
  .stat{background:#fff;border-radius:16px;padding:18px;text-align:center}
  .stat strong{display:block;font-family:var(--font-head);font-size:28px;color:var(--orange)}
  .stat span{font-size:13px;color:#7a736b}
  @media(max-width:720px){.stats{grid-template-columns:repeat(2,1fr)}}
</style>
```

- [ ] **Step 2: Create SectionHeader.astro**

```astro
---
const { eyebrow, title, sub } = Astro.props;
---
<div class="sh">
  {eyebrow && <span class="eyebrow">{eyebrow}</span>}
  <h2>{title}</h2>
  {sub && <p>{sub}</p>}
</div>
<style>
  .sh{margin-bottom:18px}.eyebrow{color:var(--orange);font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.05em}
  .sh p{color:#7a736b;margin-top:6px;max-width:600px}
</style>
```

- [ ] **Step 3: Create QrBlock.astro**

```astro
<section class="qr container">
  <div>
    <h2>No app needed</h2>
    <p>Scan. See. Sip. QR stickers on every table, takeaway bag and the storefront window. One scan opens the full menu — order in seconds.</p>
  </div>
  <div class="qr-art" aria-hidden="true">▦</div>
</section>
<style>
  .qr{display:grid;grid-template-columns:2fr 1fr;gap:24px;align-items:center;background:#fff;border-radius:24px;padding:32px;margin-top:40px}
  .qr-art{font-size:120px;text-align:center;color:var(--ink)}
  @media(max-width:720px){.qr{grid-template-columns:1fr}}
</style>
```

- [ ] **Step 4: Create index.astro**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SectionHeader from '../components/SectionHeader.astro';
import StatRow from '../components/StatRow.astro';
import QrBlock from '../components/QrBlock.astro';
import MenuCard from '../components/MenuCard.astro';
import CartDrawer from '../components/CartDrawer.astro';
import site from '../data/site.json';
import menu from '../data/menu.json';
const popular = menu.filter((m) => m.popular).slice(0, 6);
const wa = `https://wa.me/${site.whatsapp}`;
const maps = `https://maps.google.com/?q=${encodeURIComponent(site.mapsQuery)}`;
---
<BaseLayout title="Marmara — Tacos, burgers & fresh juice in Ben Guerir" description="Late-night food in Ben Guerir, 2 minutes from UM6P. Sandwiches, Moroccan tacos, burgers, pizza & fresh juice. Dine in, takeaway or delivery — open till 1 AM.">
  <section class="hero container">
    <span class="badge">{site.hero.badge}</span>
    <h1>{site.hero.headline}</h1>
    <p class="sub">{site.hero.sub}</p>
    <div class="cta"><a class="btn btn-primary" href="/menu">See the menu</a><a class="btn btn-ghost" href={wa}>Order now</a></div>
    <StatRow />
  </section>

  <section class="container">
    <SectionHeader eyebrow="Skip the line" title="Order ahead, walk past the queue" sub="Send your picks on WhatsApp. We cook fresh, timed to your arrival. No app to download." />
  </section>

  <section class="container">
    <SectionHeader eyebrow="Popular" title="What people are ordering" />
    <div class="grid">{popular.map((item) => <MenuCard item={item} />)}</div>
  </section>

  <section class="container loc">
    <div>
      <SectionHeader eyebrow="Open until 1 AM" title="Open when everything else is closed" sub={`${site.address}. Cash & card on pickup.`} />
      <div class="cta"><a class="btn btn-primary" href={maps}>Open in Google Maps</a><a class="btn btn-ghost" href={wa}>Call / WhatsApp</a></div>
    </div>
  </section>

  <QrBlock />
  <CartDrawer />
  <script>import '../scripts/menu-island.js';</script>
</BaseLayout>
<style>
  .hero{padding:50px 20px 10px}.badge{display:inline-block;background:#fff;border-radius:999px;padding:6px 14px;font-weight:700;font-size:13px}
  .hero h1{font-size:clamp(36px,7vw,64px);margin:14px 0}.sub{max-width:620px;color:#5b544d;font-size:18px}
  .cta{display:flex;gap:12px;margin-top:20px;flex-wrap:wrap}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-top:14px}
  .loc{margin-top:40px}
</style>
```

- [ ] **Step 5: Build + verify**

Run: `npm run build`
Expected: home renders hero, stats, popular picks (6 cards), location, QR. `npm test` still PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/SectionHeader.astro src/components/StatRow.astro src/components/QrBlock.astro src/pages/index.astro
git commit -m "feat: home page"
```

---

### Task 9: About + Visit pages

**Files:**
- Create: `src/pages/about.astro`, `src/pages/visit.astro`

**Interfaces:**
- Consumes: `site.json`, `StatRow`, `SectionHeader`.
- Produces: `/about` (story, beliefs, stats) and `/visit` (map embed, hours table with today highlighted, address, getting-here).

- [ ] **Step 1: Create about.astro**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SectionHeader from '../components/SectionHeader.astro';
import StatRow from '../components/StatRow.astro';
import site from '../data/site.json';
---
<BaseLayout title="About — Marmara, Ben Guerir" description="Good food, any hour. The story behind Marmara in Ben Guerir.">
  <section class="container" style="padding:40px 20px">
    <SectionHeader eyebrow="Our story" title="Good food, any hour." />
    <p style="max-width:680px;font-size:18px;color:#5b544d">{site.about.story}</p>
    <h2 style="margin-top:40px">{site.about.beliefHeading}</h2>
    <p style="max-width:680px;color:#5b544d;margin-top:10px">{site.about.beliefBody}</p>
    <StatRow />
    <div class="cta" style="display:flex;gap:12px;margin-top:10px">
      <a class="btn btn-primary" href="/menu">See the menu</a>
      <a class="btn btn-ghost" href={`https://wa.me/${site.whatsapp}`}>Order now</a>
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Create visit.astro** (today-highlight computed at runtime in a tiny inline script)

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SectionHeader from '../components/SectionHeader.astro';
import site from '../data/site.json';
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const maps = `https://maps.google.com/?q=${encodeURIComponent(site.mapsQuery)}`;
---
<BaseLayout title="Visit — Marmara, Ben Guerir" description="Find Marmara on Avenue Hassan II in Ben Guerir, 2 minutes from UM6P. Open every day 9 AM–1 AM.">
  <section class="container" style="padding:40px 20px">
    <SectionHeader eyebrow="Find us" title="Two minutes from campus." sub={`On the corner of Avenue Hassan II, in the heart of Ben Guerir. ${site.address}`} />
    <a class="btn btn-primary" href={maps}>Open in Maps</a>
    <div class="map" aria-label="Map location">Interactive Google Map — Marmara, Ben Guerir</div>
    <h2 style="margin-top:30px">Opening hours</h2>
    <table class="hours">
      {days.map((d) => (
        <tr data-day={d}><td>{d}</td><td>{site.hours.open} – {site.hours.close}</td></tr>))}
    </table>
    <p style="color:#7a736b;margin-top:8px">Hours may extend on weekends and during exam season.</p>
  </section>
  <script define:vars={{ days }}>
    const idx = (new Date().getDay() + 6) % 7;
    document.querySelectorAll('.hours tr')[idx]?.style.setProperty('color', 'var(--orange)');
  </script>
</BaseLayout>
<style>
  .map{height:260px;background:linear-gradient(135deg,#e8efe0,#d6e4f0);border-radius:18px;display:flex;align-items:center;justify-content:center;color:#5b544d;margin-top:16px}
  .hours{width:100%;max-width:420px;border-collapse:collapse;margin-top:10px}
  .hours td{padding:8px 0;border-bottom:1px solid rgba(24,20,16,.08)}
  .hours td:last-child{text-align:right;font-weight:700}
</style>
```

- [ ] **Step 3: Build + verify**

Run: `npm run build`
Expected: both pages render; visit highlights the current weekday. `npm test` PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/about.astro src/pages/visit.astro
git commit -m "feat: about and visit pages"
```

---

### Task 10: Catering page + quote → WhatsApp

**Files:**
- Create: `src/pages/catering.astro`
- Create: `src/data/catering.json`
- Create: `src/scripts/catering-island.js`

**Interfaces:**
- Consumes: `site.json`, `buildContactUrl` from `whatsapp.js`, `catering.json`.
- Produces: `/catering` with trust badges, packages, a quote form whose "Send" opens a prefilled `wa.me` message.

- [ ] **Step 1: Create catering.json** (extract real packages from source via Appendix A; if extraction unavailable, use these defaults derived from the source copy)

```json
{
  "freeDeliveryNote": "Free delivery near UM6P over 200 MAD",
  "noticeNote": "Order at least 24 hours ahead for groups over 20",
  "trust": [
    { "title": "From 5 to 120+", "note": "small huddle or big event" },
    { "title": "Cooked fresh", "note": "arrives hot & ready to serve" },
    { "title": "Free delivery", "note": "near UM6P over 200 MAD" },
    { "title": "24h notice", "note": "for larger groups" }
  ],
  "perHeadEstimate": 45
}
```

- [ ] **Step 2: Create catering-island.js**

```js
import { buildContactUrl } from './whatsapp.js';
const form = document.getElementById('quote-form');
const phone = form.dataset.whatsapp;
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(form);
  const msg = `Catering request — Marmara\nName: ${d.get('name')}\nEvent: ${d.get('type')}\nPeople: ${d.get('people')}\nDate: ${d.get('date')} ${d.get('time')}\nNotes: ${d.get('notes') || '—'}`;
  window.open(buildContactUrl(phone, msg), '_blank');
});
const people = form.querySelector('[name=people]');
const est = document.getElementById('estimate');
const PERHEAD = 45;
const update = () => { est.textContent = `Rough estimate: ${(Number(people.value) || 0) * PERHEAD} MAD`; };
people.addEventListener('input', update); update();
```

- [ ] **Step 3: Create catering.astro**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SectionHeader from '../components/SectionHeader.astro';
import catering from '../data/catering.json';
import site from '../data/site.json';
---
<BaseLayout title="Catering & group orders — Marmara" description="Feed the whole group. Club events, study sessions, office mornings, birthdays. Fresh, hot, ready. Free delivery near UM6P over 200 MAD.">
  <section class="container" style="padding:40px 20px">
    <SectionHeader eyebrow="Catering & group orders" title="Feed the whole group." sub="Club events, study sessions, office mornings, birthdays. Tell us how many and when — we’ll have it fresh, hot and ready." />
    <div class="trust">{catering.trust.map((t) => (<div class="t"><strong>{t.title}</strong><span>{t.note}</span></div>))}</div>

    <h2 style="margin-top:30px">Request a quote</h2>
    <p style="color:#7a736b">Fill this in and it sends straight to our WhatsApp — no email, no waiting.</p>
    <form id="quote-form" data-whatsapp={site.whatsapp} class="form">
      <input name="name" placeholder="Your name" required />
      <select name="type"><option>Club / student event</option><option>Study session</option><option>Office / company</option><option>Birthday / party</option><option>Other</option></select>
      <input name="people" type="number" min="1" value="20" />
      <input name="date" type="date" />
      <input name="time" type="time" />
      <textarea name="notes" placeholder="Anything else? (allergies, delivery spot)"></textarea>
      <p id="estimate" class="est"></p>
      <button class="btn btn-primary" type="submit">Send my request on WhatsApp</button>
    </form>
    <p style="color:#7a736b;margin-top:10px">{catering.freeDeliveryNote}. {catering.noticeNote}.</p>
  </section>
  <script>import '../scripts/catering-island.js';</script>
</BaseLayout>
<style>
  .trust{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:20px}
  .t{background:#fff;border-radius:16px;padding:16px}.t strong{display:block}.t span{color:#7a736b;font-size:13px}
  .form{display:grid;gap:12px;max-width:480px;margin-top:14px}
  .form input,.form select,.form textarea{padding:12px;border:1.5px solid rgba(24,20,16,.15);border-radius:12px;font:inherit}
  .est{font-weight:700}
  @media(max-width:720px){.trust{grid-template-columns:1fr 1fr}}
</style>
```

- [ ] **Step 4: Build + verify**

Run: `npm run build && npm run preview`
Expected: `/catering` shows trust badges, live estimate updates with people count, submit opens prefilled WhatsApp. `npm test` PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/catering.astro src/data/catering.json src/scripts/catering-island.js
git commit -m "feat: catering page with WhatsApp quote form"
```

---

### Task 11: Owner dashboard (localStorage CMS) — logic module first (TDD)

**Files:**
- Create: `src/scripts/cms.js`
- Test: `src/scripts/cms.test.js`

**Interfaces:**
- Produces:
  - `mergeContent(defaults, overrides)` → object: returns `defaults` with any non-empty string/defined override fields applied (mirrors the source's `pick(v, def)`).
  - `loadContent(storageKey, defaults, storage)` → object: reads JSON from `storage.getItem(storageKey)`, merges onto defaults; returns defaults on missing/invalid JSON.
  - `saveContent(storageKey, content, storage)` → void.
  - Storage key constant: `STORAGE_KEY = 'marmara_site_content'`.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cms`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

```js
// src/scripts/cms.js
export const STORAGE_KEY = 'marmara_site_content';
const ok = (v) => typeof v === 'string' ? v.trim().length > 0 : v !== undefined && v !== null;

export function mergeContent(defaults, overrides) {
  const out = { ...defaults };
  for (const k of Object.keys(defaults)) if (ok(overrides?.[k])) out[k] = overrides[k];
  return out;
}
export function loadContent(storageKey, defaults, storage) {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return { ...defaults };
    return mergeContent(defaults, JSON.parse(raw));
  } catch { return { ...defaults }; }
}
export function saveContent(storageKey, content, storage) {
  storage.setItem(storageKey, JSON.stringify(content));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cms`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/cms.js src/scripts/cms.test.js
git commit -m "feat: localStorage CMS merge/load/save logic with tests"
```

---

### Task 12: Owner dashboard page (UI + wiring)

**Files:**
- Create: `src/pages/dashboard.astro`
- Create: `src/scripts/dashboard-island.js`

**Interfaces:**
- Consumes: `cms.js` (`loadContent`/`saveContent`/`STORAGE_KEY`), `menu.json`, `site.json`.
- Produces: `/dashboard` — an owner panel with: store open/closed toggle, promo banner text, editable homepage headline + about story with **live preview**, a read-only menu table (count + categories), and a demo "recent orders" list. All editable text persists to `localStorage` and is announced as demo-grade.

- [ ] **Step 1: Create dashboard.astro** (panel shell)

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import menu from '../data/menu.json';
import site from '../data/site.json';
const demoOrders = [
  { code: '#1042', customer: 'Yassine', summary: '2x Chicken Tacos, 1x Orange Press', total: '85 MAD', time: '23:14', status: 'New' },
  { code: '#1041', customer: 'Salma', summary: '1x Double Burger, 1x Avocado Cocktail', total: '80 MAD', time: '22:58', status: 'Cooking' },
  { code: '#1040', customer: 'Omar', summary: '1x Marmara Special Pizza', total: '65 MAD', time: '22:30', status: 'Ready' },
];
---
<BaseLayout title="Owner dashboard — Marmara" description="Marmara owner panel (demo).">
  <section class="container dash">
    <div class="dash-head"><h1>Owner panel</h1><span class="demo">Demo — changes save to this device only</span></div>

    <div class="grid2">
      <div class="card">
        <h3>Store status</h3>
        <label class="switch"><input type="checkbox" id="store-open" checked /> Open for orders</label>
      </div>
      <div class="card">
        <h3>Promo banner</h3>
        <input id="promo-text" placeholder="Shows as a strip across the top of your site" />
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h3>Homepage headline</h3>
        <input id="heroHeadline" value={site.hero.headline} />
        <h3 style="margin-top:14px">About story</h3>
        <textarea id="aboutStory">{site.about.story}</textarea>
        <button class="btn btn-primary" id="save" style="margin-top:12px">Save</button>
        <span id="saved" class="saved"></span>
      </div>
      <div class="card preview">
        <h3>Live preview</h3>
        <div class="pv-head" id="pv-head">{site.hero.headline}</div>
        <p class="pv-body" id="pv-body">{site.about.story}</p>
      </div>
    </div>

    <div class="card">
      <h3>Recent orders <small>(via WhatsApp)</small></h3>
      <table class="orders">
        <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Time</th><th>Status</th></tr>
        {demoOrders.map((o) => (<tr><td>{o.code}</td><td>{o.customer}</td><td>{o.summary}</td><td>{o.total}</td><td>{o.time}</td><td>{o.status}</td></tr>))}
      </table>
    </div>

    <div class="card">
      <h3>Menu — {menu.length} plates</h3>
      <p>Photos and details here appear on your public Menu page.</p>
      <table class="orders">
        <tr><th>Plate</th><th>Category</th><th>Price</th></tr>
        {menu.map((m) => (<tr><td>{m.name}</td><td>{m.category}</td><td>{m.price} MAD</td></tr>))}
      </table>
    </div>
  </section>
  <script>import '../scripts/dashboard-island.js';</script>
</BaseLayout>
<style>
  .dash{padding:40px 20px}.dash-head{display:flex;align-items:center;gap:14px}
  .demo{background:#fff3e0;color:#a85800;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:700}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
  .card{background:#fff;border-radius:18px;padding:20px}
  .card input,.card textarea{width:100%;padding:10px;border:1.5px solid rgba(24,20,16,.15);border-radius:10px;font:inherit;margin-top:6px}
  .preview .pv-head{font-family:var(--font-head);font-weight:800;font-size:24px}
  .orders{width:100%;border-collapse:collapse;margin-top:10px;font-size:14px}
  .orders th,.orders td{text-align:left;padding:8px;border-bottom:1px solid rgba(24,20,16,.08)}
  .saved{color:#2e7d32;font-weight:700;margin-left:10px}
  @media(max-width:720px){.grid2{grid-template-columns:1fr}.orders{display:block;overflow-x:auto}}
</style>
```

- [ ] **Step 2: Create dashboard-island.js**

```js
import { loadContent, saveContent, STORAGE_KEY } from './cms.js';

const defaults = {
  heroHeadline: document.getElementById('heroHeadline').value,
  aboutStory: document.getElementById('aboutStory').value,
  promoText: '',
  storeOpen: true,
};
const c = loadContent(STORAGE_KEY, defaults, localStorage);

const head = document.getElementById('heroHeadline');
const story = document.getElementById('aboutStory');
const promo = document.getElementById('promo-text');
const open = document.getElementById('store-open');
head.value = c.heroHeadline; story.value = c.aboutStory; promo.value = c.promoText; open.checked = c.storeOpen;

const pvHead = document.getElementById('pv-head');
const pvBody = document.getElementById('pv-body');
const sync = () => { pvHead.textContent = head.value; pvBody.textContent = story.value; };
head.addEventListener('input', sync); story.addEventListener('input', sync); sync();

document.getElementById('save').addEventListener('click', () => {
  saveContent(STORAGE_KEY, { heroHeadline: head.value, aboutStory: story.value, promoText: promo.value, storeOpen: open.checked }, localStorage);
  const s = document.getElementById('saved'); s.textContent = 'Saved ✓';
  setTimeout(() => (s.textContent = ''), 1500);
});
```

- [ ] **Step 3: Build + verify**

Run: `npm run build && npm run preview`
Expected: `/dashboard` edits update the live preview; Save persists across reload (same browser); demo badge visible. `npm test` PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard.astro src/scripts/dashboard-island.js
git commit -m "feat: owner dashboard with localStorage CMS and live preview"
```

---

### Task 13: Images, favicon, OG image

**Files:**
- Create: `public/favicon.svg`, `public/og-image.png` (or `.svg`)
- Create: `public/images/*` (stock photos)
- Modify: `MenuCard.astro`, `index.astro`, `about.astro` to use real `<img>` where the design shows a photo (with descriptive `alt`).

**Interfaces:**
- Consumes: nothing new. Produces: real imagery + share preview.

- [ ] **Step 1: Add favicon.svg** (brand mark)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#FF8A1E"/><text x="32" y="44" font-size="34" text-anchor="middle">🍽️</text></svg>
```

- [ ] **Step 2: Source stock photos**

Download 6–10 royalty-free photos (Pexels/Unsplash license) matching: tacos, burger, pizza, fresh juice, breakfast/msemen, warm food counter at night. Save as `public/images/<name>.jpg`, max 1600px wide, compressed. Record source URLs + license in `public/images/CREDITS.md`.

- [ ] **Step 3: Wire a hero/counter photo into the home and about pages, and food photos into popular `MenuCard`s**

Add `image` (optional) to relevant items in `menu.json` (e.g. the 6 popular items): `"image": "/images/chicken-tacos.jpg"`. In `MenuCard.astro` render `{item.image ? <img src={item.image} alt={item.name} /> : <div class="thumb" ...>}`.

- [ ] **Step 4: Create og-image** (1200×630) — a branded card with logo + tagline. Export to `public/og-image.png`.

- [ ] **Step 5: Build + verify**

Run: `npm run build`
Expected: images load, no broken paths, favicon + OG present. `npm test` PASS.

- [ ] **Step 6: Commit**

```bash
git add public/ src/components/MenuCard.astro src/data/menu.json src/pages/index.astro src/pages/about.astro
git commit -m "feat: real imagery, favicon and OG share image"
```

---

### Task 14: README, deploy config, final QA

**Files:**
- Create: `README.md`, `public/_headers` (Cloudflare) or `netlify.toml`
- Modify: top-level `CLAUDE.md` (note: site now lives in `src/`, the old bundle is reference only)

**Interfaces:** none (delivery task).

- [ ] **Step 1: Write README.md**

Include: project summary (Marmara, Ben Guerir), screenshot, stack (Astro), how to run (`npm install`, `npm run dev`), structure overview, the **honest note** that the dashboard is a `localStorage` demo (not a multi-device CMS — phase 2 = real backend), and a "swap in real photos/phone/Instagram" checklist for go-live.

- [ ] **Step 2: Add deploy config**

`netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"
```
(Cloudflare Pages: build command `npm run build`, output dir `dist`.)

- [ ] **Step 3: Final QA pass**

Run: `npm run build && npm run preview`
Manually verify on a narrow viewport (mobile): nav, all 6 routes, menu ordering → WhatsApp, catering quote → WhatsApp, dashboard save/preview, all links (WhatsApp/Instagram/Maps) resolve. Run `npm test` — ALL tests PASS.

- [ ] **Step 4: Commit + note deploy step**

```bash
git add README.md netlify.toml CLAUDE.md
git commit -m "docs: README, deploy config, go-live checklist"
```

Deploy: connect the repo to Cloudflare Pages or Netlify (build `npm run build`, output `dist`) → live URL for the pitch. (Manual, owner/author action.)

---

## Appendix A — Re-extracting content from the source bundle

If any data file needs re-deriving from `Marmara Restaurant Website.html`, the menu was
extracted with this approach (Python): find the per-page `__bundler/template` blocks,
then regex item objects `id:'..', name:'..', desc:'..', price:NN, cat:'..', ... popular:bool`,
HTML-unescape names/descs. Catering packages live in the catering page template's
`DCLogic` state under `packages`/`PERHEAD`; trust badges under the `trust` array. The
authoritative extracted menu is already at `src/data/menu.json` (34 items, 9 categories).

## Self-Review Notes

- **Spec coverage:** every spec section maps to a task — Astro scaffold (T1), tokens/CSS (T5), BaseLayout+SEO+Nav/Footer (T6), menu+ordering (T7), home (T8), about/visit (T9), catering (T10), dashboard+localStorage (T11–12), images/OG (T13), README+deploy+honest-note (T14). Pure logic isolated + tested (T2 whatsapp, T3 cart, T11 cms).
- **Placeholder scan:** no "TBD/TODO"; data files contain real values; catering defaults provided inline with Appendix A fallback for exact packages.
- **Type consistency:** cart item shape `{id,name,price,qty}` consistent across T3/T7; `buildOrderUrl(cart,{phone})` / `buildContactUrl(phone,msg)` consistent across T2/T7/T10; `loadContent/saveContent/mergeContent/STORAGE_KEY` consistent across T11/T12.
```
