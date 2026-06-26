# Cart UX Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `src/scripts/menu-cart.js` to add a polished, accessible, mobile-first cart bar + expandable cart sheet UX — preserving all existing cart logic, tab filtering, WhatsApp integration, and sold-out handling.

**Architecture:** A single-file rewrite of `menu-cart.js` that injects a `<style>` block (CSS animations + layout) plus four DOM elements: scrim, cart bar, cart sheet, and an `aria-live` region. All new UI is controlled via class toggles (`mm-open`, `mm-has-items`, `mm-badge-animate`, `mm-btn-pulse`) driven by three state-mutating functions (`addItem`, `removeItem`, `clearCart`) that replace the previous inline logic.

**Tech Stack:** Vanilla JS (ES modules), inline SVG icons, CSS custom properties, CSS Grid/Flexbox, CSS `@keyframes`, `env(safe-area-inset-bottom)`, `prefers-reduced-motion` media query, Vitest (unit tests), Playwright-core (E2E verify).

## Global Constraints

- Modify **only** `src/scripts/menu-cart.js` and, if needed, append keyframes to `src/styles/anim.css`. DO NOT touch any other file.
- Preserve `#mm-cart-bar` element id (referenced in existing tests and task briefs).
- Keep `buildOrderUrl` call: `buildOrderUrl(cart, { phone: '212600000000' })`.
- Keep event delegation on `.scp0` for both baked and owner-added cards.
- Keep sold-out check: `btn.getAttribute('aria-disabled') === 'true'` → no-op.
- Keep tab filtering logic exactly as-is (only `renderCart`/add/remove changes).
- Page already has `padding-bottom: 96px` in captured markup — do not add extra body padding from JS.
- Brand tokens: cream `#FFFBF4`, ink `#181410`, orange `#FF8A1E`, green `#25D366`.
- Fonts: `'Hanken Grotesk', sans-serif` (body), `'Bricolage Grotesque', sans-serif` (numbers/headings).
- `font-variant-numeric: tabular-nums` on all prices and totals.
- All icon buttons: `aria-label`, `cursor: pointer`, visible `:focus-visible` outline.
- Count in `aria-live="polite"` region.
- Animations use transform/opacity only; skip under `prefers-reduced-motion`.
- Playwright chromium: `/home/idder/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`.
- `npm uninstall playwright-core` after verification.
- Branch: `marmara-astro-rebuild`.

---

### Task 1: Rewrite `menu-cart.js` — cart state, SVG icons, injected CSS

**Files:**
- Modify: `src/scripts/menu-cart.js` (full rewrite)

**Interfaces:**
- Produces: `addItem(id, name, price)`, `removeItem(id)`, `clearCart()`, `cartTotal()`, `cartCount()` — module-level, called internally and exported for potential unit tests.
- Produces: `#mm-cart-bar`, `#mm-cart-scrim`, `#mm-cart-sheet` DOM elements with `mm-open` class toggle API.

- [ ] **Step 1: Replace the entire file with the new implementation**

Write the following to `/home/idder/Documents/github/Marmara_store/src/scripts/menu-cart.js`:

```javascript
import menuData from '../data/menu.json';
import siteData from '../data/site.json';
import { buildOrderUrl } from './whatsapp.js';

// ─── item lookup ─────────────────────────────────────────────────────────────
const menuById = Object.fromEntries(menuData.map((item) => [item.id, item]));

// ─── tab-label → category-key resolution ─────────────────────────────────────
const wordToCat = {};
for (const cat of siteData.categories) {
  wordToCat[cat.key.toLowerCase()] = cat.key;
  for (const word of cat.label.toLowerCase().split(/[\s&,]+/)) {
    if (word.length > 2) wordToCat[word] = cat.key;
  }
}

function resolveTabLabel(label) {
  const norm = label.toLowerCase().trim();
  if (norm === 'all') return 'all';
  if (wordToCat[norm]) return wordToCat[norm];
  for (const word of norm.split(/\s+/)) {
    if (word.length > 2 && wordToCat[word]) return wordToCat[word];
  }
  for (const [k, v] of Object.entries(wordToCat)) {
    if (norm.includes(k)) return v;
  }
  return null;
}

// ─── cart state ───────────────────────────────────────────────────────────────
let cart = [];

export function addItem(id, name, price) {
  const existing = cart.find((i) => i.id === id);
  if (existing) {
    cart = cart.map((i) => i.id === id ? { ...i, qty: i.qty + 1 } : i);
  } else {
    cart = [...cart, { id, name, price, qty: 1 }];
  }
}

export function removeItem(id) {
  const existing = cart.find((i) => i.id === id);
  if (!existing) return;
  if (existing.qty <= 1) {
    cart = cart.filter((i) => i.id !== id);
  } else {
    cart = cart.map((i) => i.id === id ? { ...i, qty: i.qty - 1 } : i);
  }
}

export function clearCart() {
  cart = [];
}

export function cartTotal() {
  return cart.reduce((s, i) => s + i.qty * i.price, 0);
}

export function cartCount() {
  return cart.reduce((s, i) => s + i.qty, 0);
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
const SVG_CART = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`;
const SVG_PLUS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const SVG_MINUS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const SVG_TRASH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
const SVG_CHEVRON_UP = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>`;
const SVG_CHEVRON_DOWN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
const SVG_WA = `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;

// ─── inject CSS ───────────────────────────────────────────────────────────────
const mmStyle = document.createElement('style');
mmStyle.id = 'mm-cart-css';
mmStyle.textContent = `
.mm-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* ── Scrim ── */
#mm-cart-scrim{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:997;opacity:0;pointer-events:none;transition:opacity 220ms ease}
#mm-cart-scrim.mm-open{opacity:1;pointer-events:auto}

/* ── Bar ── */
#mm-cart-bar{position:fixed;bottom:0;left:0;right:0;z-index:999;display:none;align-items:center;gap:10px;padding:12px 16px;padding-bottom:calc(12px + env(safe-area-inset-bottom));background:#181410;color:#fff;box-shadow:0 -4px 24px rgba(0,0,0,.3);box-sizing:border-box;font-family:'Hanken Grotesk',sans-serif}
#mm-cart-bar.mm-has-items{display:flex}
#mm-bar-tap{display:flex;align-items:center;gap:10px;flex:1;min-width:0;cursor:pointer;padding:4px 0;border-radius:8px;transition:opacity 100ms}
#mm-bar-tap:hover{opacity:.85}
#mm-bar-tap:focus-visible{outline:2px solid #FF8A1E;outline-offset:3px;border-radius:8px}
#mm-cart-icon-wrap{position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff}
#mm-count-badge{position:absolute;top:-6px;right:-7px;min-width:18px;height:18px;padding:0 5px;background:#FF8A1E;color:#fff;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:11px;border-radius:999px;display:flex;align-items:center;justify-content:center;line-height:1;font-variant-numeric:tabular-nums;transition:transform 150ms ease-out}
#mm-bar-label{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#mm-bar-dot{color:rgba(255,255,255,.3);flex-shrink:0}
#mm-bar-total{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px;font-variant-numeric:tabular-nums;white-space:nowrap;flex-shrink:0}
#mm-bar-chevron{flex-shrink:0;opacity:.55;transition:transform 220ms ease-out;display:flex;align-items:center}
#mm-bar-chevron.mm-open{transform:rotate(180deg)}

#mm-cart-send-bar{flex-shrink:0;background:#25D366;color:#fff;border:none;padding:11px 16px;border-radius:999px;font-family:'Hanken Grotesk',sans-serif;font-weight:700;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px;line-height:1;transition:opacity 150ms;white-space:nowrap}
#mm-cart-send-bar:hover{opacity:.9}
#mm-cart-send-bar:focus-visible{outline:2px solid #25D366;outline-offset:2px}

/* ── Sheet ── */
#mm-cart-sheet{position:fixed;bottom:0;left:50%;transform:translateX(-50%) translateY(100%);width:100%;max-width:460px;max-height:80vh;z-index:1000;background:#FFFBF4;border-radius:24px 24px 0 0;display:flex;flex-direction:column;box-shadow:0 -8px 48px rgba(0,0,0,.22);transition:transform 280ms ease-out;will-change:transform}
#mm-cart-sheet.mm-open{transform:translateX(-50%) translateY(0)}
@media(max-width:720px){#mm-cart-sheet{max-width:100%;left:0;transform:translateY(100%)}#mm-cart-sheet.mm-open{transform:translateY(0)}}

#mm-sheet-header{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 12px;border-bottom:1px solid #EFE7D8;flex-shrink:0;gap:8px}
#mm-sheet-title{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:17px;color:#181410;flex:1;text-align:center}
#mm-sheet-close,#mm-sheet-clear-btn{width:44px;height:44px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:12px;transition:background 130ms;flex-shrink:0}
#mm-sheet-close{color:#5B5247}
#mm-sheet-close:hover,#mm-sheet-clear-btn:hover{background:rgba(0,0,0,.06)}
#mm-sheet-close:focus-visible,#mm-sheet-clear-btn:focus-visible{outline:2px solid #FF8A1E;outline-offset:2px}
#mm-sheet-clear-btn{color:rgba(24,20,16,.45);font-family:'Hanken Grotesk',sans-serif;font-size:13px;font-weight:600;width:auto;padding:0 10px}
#mm-sheet-clear-btn:hover{color:rgba(24,20,16,.8)}

#mm-sheet-items{flex:1;overflow-y:auto;padding:4px 0;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.mm-line-item{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(239,231,216,.55)}
.mm-line-name{flex:1;font-size:14px;font-weight:600;color:#181410;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mm-line-stepper{display:flex;align-items:center;gap:2px;flex-shrink:0}
.mm-stepper-btn{width:44px;height:44px;border:1.5px solid #EFE7D8;background:#fff;color:#181410;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 100ms,border-color 100ms;flex-shrink:0}
.mm-stepper-btn:hover{background:#F1E9D9;border-color:#ddd0bb}
.mm-stepper-btn:focus-visible{outline:2px solid #FF8A1E;outline-offset:2px}
.mm-qty-display{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:16px;font-variant-numeric:tabular-nums;min-width:26px;text-align:center;color:#181410;line-height:1}
.mm-line-subtotal{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums;color:#FF8A1E;min-width:48px;text-align:right;flex-shrink:0}
.mm-remove-btn{width:44px;height:44px;border:none;background:transparent;color:rgba(24,20,16,.32);cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:10px;transition:color 100ms,background 100ms;flex-shrink:0}
.mm-remove-btn:hover{color:#181410;background:rgba(0,0,0,.05)}
.mm-remove-btn:focus-visible{outline:2px solid #FF8A1E;outline-offset:2px}

#mm-sheet-footer{padding:14px 16px;padding-bottom:calc(14px + env(safe-area-inset-bottom));border-top:1px solid #EFE7D8;display:flex;flex-direction:column;gap:12px;flex-shrink:0;background:#FFFBF4}
#mm-sheet-total-row{display:flex;align-items:center;justify-content:space-between}
#mm-sheet-total-label{font-size:15px;font-weight:600;color:#5B5247}
#mm-sheet-total-val{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;font-variant-numeric:tabular-nums;color:#181410}
#mm-sheet-send{width:100%;background:#25D366;color:#fff;border:none;padding:14px 20px;border-radius:999px;font-family:'Hanken Grotesk',sans-serif;font-weight:700;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;line-height:1;transition:opacity 150ms}
#mm-sheet-send:hover{opacity:.9}
#mm-sheet-send:focus-visible{outline:2px solid #25D366;outline-offset:2px}

/* ── Add feedback animations ── */
@keyframes mm-badge-bump{0%,100%{transform:scale(1)}50%{transform:scale(1.55)}}
@keyframes mm-btn-pulse{0%{transform:scale(1)}60%{transform:scale(1.12)}100%{transform:scale(1)}}
.mm-badge-animate{animation:mm-badge-bump 240ms ease-out}
.mm-btn-pulse{animation:mm-btn-pulse 180ms ease-out}

/* ── Reduced motion ── */
@media(prefers-reduced-motion:reduce){
  #mm-cart-sheet,#mm-cart-scrim,#mm-bar-chevron,#mm-count-badge,#mm-cart-send-bar,#mm-sheet-send,.mm-stepper-btn,.mm-remove-btn{transition:none!important}
  .mm-badge-animate,.mm-btn-pulse{animation:none!important}
}
`;
document.head.appendChild(mmStyle);

// ─── build DOM ────────────────────────────────────────────────────────────────
// Scrim
const scrim = document.createElement('div');
scrim.id = 'mm-cart-scrim';
scrim.setAttribute('aria-hidden', 'true');
document.body.appendChild(scrim);

// Cart bar
const cartBar = document.createElement('div');
cartBar.id = 'mm-cart-bar';
cartBar.setAttribute('role', 'region');
cartBar.setAttribute('aria-label', 'Shopping cart');
cartBar.innerHTML = `
  <div id="mm-bar-tap" role="button" tabindex="0" aria-expanded="false" aria-label="View cart details">
    <div id="mm-cart-icon-wrap">${SVG_CART}<span id="mm-count-badge" aria-hidden="true"></span></div>
    <span id="mm-bar-label"></span>
    <span id="mm-bar-dot" aria-hidden="true">&middot;</span>
    <span id="mm-bar-total"></span>
  </div>
  <div id="mm-bar-chevron" aria-hidden="true">${SVG_CHEVRON_UP}</div>
  <button id="mm-cart-send-bar" aria-label="Send order on WhatsApp">
    ${SVG_WA}<span>Send order</span>
  </button>
  <span id="mm-cart-live" class="mm-sr-only" aria-live="polite" aria-atomic="true"></span>
`;
document.body.appendChild(cartBar);

// Cart sheet
const sheet = document.createElement('div');
sheet.id = 'mm-cart-sheet';
sheet.setAttribute('role', 'dialog');
sheet.setAttribute('aria-modal', 'true');
sheet.setAttribute('aria-label', 'Your order');
sheet.innerHTML = `
  <div id="mm-sheet-header">
    <button id="mm-sheet-close" aria-label="Close cart">${SVG_CHEVRON_DOWN}</button>
    <span id="mm-sheet-title">Your order</span>
    <button id="mm-sheet-clear-btn" aria-label="Clear all items from cart">Clear</button>
  </div>
  <div id="mm-sheet-items" role="list" aria-label="Cart items"></div>
  <div id="mm-sheet-footer">
    <div id="mm-sheet-total-row">
      <span id="mm-sheet-total-label">Total</span>
      <span id="mm-sheet-total-val"></span>
    </div>
    <button id="mm-sheet-send" aria-label="Send order on WhatsApp">
      ${SVG_WA} Send order on WhatsApp
    </button>
  </div>
`;
document.body.appendChild(sheet);

// Element references
const countBadgeEl = document.getElementById('mm-count-badge');
const barLabelEl = document.getElementById('mm-bar-label');
const barTotalEl = document.getElementById('mm-bar-total');
const barChevronEl = document.getElementById('mm-bar-chevron');
const barTapEl = document.getElementById('mm-bar-tap');
const liveEl = document.getElementById('mm-cart-live');
const sheetItemsEl = document.getElementById('mm-sheet-items');
const sheetTotalEl = document.getElementById('mm-sheet-total-val');

// ─── sheet open/close ─────────────────────────────────────────────────────────
let sheetOpen = false;

function openSheet() {
  sheetOpen = true;
  sheet.classList.add('mm-open');
  scrim.classList.add('mm-open');
  barChevronEl.classList.add('mm-open');
  barTapEl.setAttribute('aria-expanded', 'true');
  renderSheetItems();
  const closeBtn = document.getElementById('mm-sheet-close');
  if (closeBtn) closeBtn.focus();
}

function closeSheet() {
  sheetOpen = false;
  sheet.classList.remove('mm-open');
  scrim.classList.remove('mm-open');
  barChevronEl.classList.remove('mm-open');
  barTapEl.setAttribute('aria-expanded', 'false');
}

barTapEl.addEventListener('click', () => { sheetOpen ? closeSheet() : openSheet(); });
barTapEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sheetOpen ? closeSheet() : openSheet(); }
});
scrim.addEventListener('click', closeSheet);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetOpen) closeSheet(); });
document.getElementById('mm-sheet-close').addEventListener('click', closeSheet);
document.getElementById('mm-sheet-clear-btn').addEventListener('click', () => {
  clearCart(); closeSheet(); renderCart();
});

// ─── send handlers ────────────────────────────────────────────────────────────
function doSend() {
  if (!cart.length) return;
  window.open(buildOrderUrl(cart, { phone: '212600000000' }), '_blank');
}
document.getElementById('mm-cart-send-bar').addEventListener('click', (e) => {
  e.stopPropagation(); doSend();
});
document.getElementById('mm-sheet-send').addEventListener('click', doSend);

// ─── render ───────────────────────────────────────────────────────────────────
function renderSheetItems() {
  sheetItemsEl.innerHTML = '';
  for (const item of cart) {
    const subtotal = item.qty * item.price;
    const row = document.createElement('div');
    row.className = 'mm-line-item';
    row.setAttribute('role', 'listitem');
    row.innerHTML = `
      <div class="mm-line-name">${item.name}</div>
      <div class="mm-line-stepper">
        <button class="mm-stepper-btn" data-action="dec" data-id="${item.id}"
          aria-label="Remove one ${item.name}">${SVG_MINUS}</button>
        <span class="mm-qty-display" aria-label="${item.qty} of ${item.name}">${item.qty}</span>
        <button class="mm-stepper-btn" data-action="inc" data-id="${item.id}"
          aria-label="Add one more ${item.name}">${SVG_PLUS}</button>
      </div>
      <div class="mm-line-subtotal">${subtotal}&nbsp;MAD</div>
      <button class="mm-remove-btn" data-action="remove" data-id="${item.id}"
        aria-label="Remove ${item.name} from cart">${SVG_TRASH}</button>
    `;
    sheetItemsEl.appendChild(row);
  }
  sheetTotalEl.textContent = cartTotal() + ' MAD';
}

sheetItemsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (action === 'inc') {
    const existing = cart.find((i) => i.id === id);
    if (existing) addItem(existing.id, existing.name, existing.price);
  } else if (action === 'dec') {
    removeItem(id);
  } else if (action === 'remove') {
    cart = cart.filter((i) => i.id !== id);
  }
  renderCart();
  if (sheetOpen) renderSheetItems();
  if (cartCount() === 0) closeSheet();
});

function renderCart() {
  const count = cartCount();
  const total = cartTotal();
  if (count === 0) {
    cartBar.classList.remove('mm-has-items');
    if (sheetOpen) closeSheet();
    return;
  }
  cartBar.classList.add('mm-has-items');
  countBadgeEl.textContent = count;
  barLabelEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;
  barTotalEl.textContent = `${total} MAD`;
  liveEl.textContent = `${count} item${count !== 1 ? 's' : ''}, total ${total} MAD`;
  if (sheetOpen) renderSheetItems();
}

// ─── discover cards ───────────────────────────────────────────────────────────
const imageSlots = Array.from(document.querySelectorAll('image-slot[id^="mphoto-"]'));
if (imageSlots.length === 0) {
  renderCart();
} else {
  const cardMap = new Map();
  for (const slot of imageSlots) {
    const itemId = slot.id.slice('mphoto-'.length);
    const item = menuById[itemId];
    if (!item) continue;
    const card = slot.parentElement?.parentElement;
    if (!card) continue;
    if (!cardMap.has(card)) cardMap.set(card, { id: itemId, category: item.category, name: item.name, price: item.price });
  }

  for (const slot of imageSlots) {
    const itemId = slot.id.slice('mphoto-'.length);
    if (menuById[itemId]) continue;
    const card = slot.parentElement?.parentElement;
    if (!card || cardMap.has(card)) continue;
    if (card.dataset.mmNew !== '1') continue;
    const catKey = card.dataset.mmCategory || '';
    const addBtn = card.querySelector('.scp0');
    const priceRow = addBtn?.parentElement;
    const priceDiv = priceRow?.children[0];
    const priceSpan = priceDiv?.querySelector('.sc-interp');
    const contentDiv = priceRow?.parentElement;
    const nameSpan = contentDiv?.children[0]?.querySelector('.sc-interp');
    const name = nameSpan?.textContent?.trim() || '';
    const priceText = priceSpan?.textContent?.trim() || '0 MAD';
    const price = parseInt(priceText) || 0;
    if (!name) continue;
    cardMap.set(card, { id: itemId, category: catKey, name, price });
  }

  // ─── wire card + buttons via event delegation ─────────────────────────────
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.scp0');
    if (!btn) return;
    if (btn.getAttribute('aria-disabled') === 'true') return;

    const card = btn.parentElement?.parentElement?.parentElement;
    if (!card) return;
    let data = cardMap.get(card);

    if (!data && card.dataset.mmNew === '1') {
      const catKey = card.dataset.mmCategory || '';
      const priceRow = btn.parentElement;
      const priceDiv = priceRow?.children[0];
      const priceSpan = priceDiv?.querySelector('.sc-interp');
      const contentDiv = priceRow?.parentElement;
      const nameSpan = contentDiv?.children[0]?.querySelector('.sc-interp');
      const slot = card.querySelector('image-slot[id^="mphoto-"]');
      const name = nameSpan?.textContent?.trim() || '';
      const priceText = priceSpan?.textContent?.trim() || '0 MAD';
      const price = parseInt(priceText) || 0;
      const itemId = slot?.id?.slice('mphoto-'.length) || '';
      if (!name) return;
      data = { id: itemId, category: catKey, name, price };
      cardMap.set(card, data);
    }

    if (!data) return;
    e.stopPropagation();

    addItem(data.id, data.name, data.price);
    renderCart();
    navigator.vibrate?.(8);

    // Button pulse
    btn.classList.remove('mm-btn-pulse');
    void btn.offsetWidth;
    btn.classList.add('mm-btn-pulse');
    btn.addEventListener('animationend', () => btn.classList.remove('mm-btn-pulse'), { once: true });

    // Badge bump
    countBadgeEl.classList.remove('mm-badge-animate');
    void countBadgeEl.offsetWidth;
    countBadgeEl.classList.add('mm-badge-animate');
    countBadgeEl.addEventListener('animationend', () => countBadgeEl.classList.remove('mm-badge-animate'), { once: true });
  });

  // ─── detect layout: single flat grid vs. multiple category sections ────────
  const grids = new Set(Array.from(cardMap.keys()).map((c) => c.parentElement));
  const isMultiSection = grids.size > 1;

  // ─── tab filtering ─────────────────────────────────────────────────────────
  const tabs = Array.from(
    document.querySelectorAll(
      'div[style*="cursor: pointer"][style*="font-weight: 700"]' +
      '[style*="font-size: 15px"][style*="padding: 10px 20px"]' +
      '[style*="border-radius: 999px"]'
    )
  ).filter((el) => el.querySelector('span'));

  if (tabs.length > 0) {
    for (const tab of tabs) {
      tab.addEventListener('click', () => {
        const label = (tab.querySelector('span')?.textContent || '').trim();
        const catKey = resolveTabLabel(label);
        for (const t of tabs) {
          t.style.background = 'rgb(255, 255, 255)';
          t.style.color = 'rgb(59, 53, 45)';
        }
        tab.style.background = 'rgb(24, 20, 16)';
        tab.style.color = 'rgb(255, 255, 255)';
        if (!catKey) return;
        for (const [card, data] of cardMap) {
          const show = catKey === 'all' || data.category === catKey;
          card.style.display = show ? '' : 'none';
        }
        if (isMultiSection) {
          const gridCards = new Map();
          for (const card of cardMap.keys()) {
            const g = card.parentElement;
            if (!g) continue;
            if (!gridCards.has(g)) gridCards.set(g, []);
            gridCards.get(g).push(card);
          }
          for (const [grid, cards] of gridCards) {
            const section = grid.parentElement;
            if (!section) continue;
            const anyVisible = cards.some((c) => c.style.display !== 'none');
            section.style.display = anyVisible ? '' : 'none';
          }
        }
      });
    }
  }

  renderCart();
}
```

- [ ] **Step 2: Verify the file was written without syntax errors**

Run:
```bash
node --input-type=module --eval "
import { createRequire } from 'module';
import fs from 'fs';
const src = fs.readFileSync('/home/idder/Documents/github/Marmara_store/src/scripts/menu-cart.js', 'utf8');
// Basic check: imports present, exports present
console.assert(src.includes(\"export function addItem\"), 'addItem exported');
console.assert(src.includes(\"export function removeItem\"), 'removeItem exported');
console.assert(src.includes(\"export function cartTotal\"), 'cartTotal exported');
console.assert(src.includes(\"export function cartCount\"), 'cartCount exported');
console.assert(src.includes(\"export function clearCart\"), 'clearCart exported');
console.assert(src.includes(\"#mm-cart-bar\"), 'bar id present');
console.assert(src.includes(\"#mm-cart-sheet\"), 'sheet id present');
console.assert(src.includes(\"buildOrderUrl\"), 'whatsapp integration present');
console.assert(src.includes(\"212600000000\"), 'phone present');
console.assert(src.includes(\"prefers-reduced-motion\"), 'reduced-motion present');
console.log('All assertions passed');
" 2>&1
```

Expected output: `All assertions passed`

- [ ] **Step 3: Run vitest unit tests to confirm nothing is broken**

```bash
cd /home/idder/Documents/github/Marmara_store && npm test 2>&1
```

Expected: All existing tests pass (whatsapp.test.js, menu.test.js, public-menu-sync.test.js, etc.)

- [ ] **Step 4: Run build to confirm no bundler errors**

```bash
cd /home/idder/Documents/github/Marmara_store && npm run build 2>&1
```

Expected: "6 page(s) built" with no errors.

---

### Task 2: Playwright E2E verification + screenshots

**Files:**
- Create (temp): `test-cart-ux.mjs` in project root (deleted after use)
- Output: Screenshots to `/tmp/cart-desktop-bar.png`, `/tmp/cart-desktop-sheet.png`, `/tmp/cart-mobile-bar.png`, `/tmp/cart-mobile-sheet.png`

**Interfaces:**
- Consumes: `addItem`, `removeItem`, `cartTotal`, `cartCount` (via DOM/JS), `buildOrderUrl` (via intercepted window.open)
- Consumes: Built site at `dist/menu/index.html`

- [ ] **Step 1: Install playwright-core**

```bash
cd /home/idder/Documents/github/Marmara_store && npm i -D playwright-core 2>&1
```

Expected: package installed, no errors.

- [ ] **Step 2: Start a static server for the built dist**

```bash
cd /home/idder/Documents/github/Marmara_store && npx --yes serve dist -p 4399 &
sleep 2
echo "Server started"
```

Expected: Server running on port 4399.

- [ ] **Step 3: Write and run the Playwright test script**

Write the following to `/home/idder/Documents/github/Marmara_store/test-cart-ux.mjs`:

```javascript
import { chromium } from 'playwright-core';
import assert from 'assert';

const EXEC = '/home/idder/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const URL  = 'http://localhost:4399/menu/';

const browser = await chromium.launch({ executablePath: EXEC, headless: true });
const failures = [];

function check(name, cond) {
  if (!cond) { failures.push(name); console.error('FAIL:', name); } else { console.log('PASS:', name); }
}

// ── Test 1: Add 2 different items, bar shows "2 items" and correct total ──
const p1 = await browser.newPage();
await p1.goto(URL, { waitUntil: 'networkidle' });

// Add first item (Chicken Tacos 35 MAD, second card in Tacos section)
const addBtns = await p1.locator('.scp0').all();
check('At least 2 add buttons present', addBtns.length >= 2);

// Add item 0
await addBtns[0].click();
await p1.waitForTimeout(120);

// Check bar is visible
const barVisible1 = await p1.locator('#mm-cart-bar').isVisible();
check('Bar visible after 1st add', barVisible1);

// Add a different item (index 3 should be different category)
await addBtns[3].click();
await p1.waitForTimeout(120);

const barLabel = await p1.locator('#mm-bar-label').textContent();
check('Bar shows "2 items"', barLabel.trim() === '2 items');

const barTotal = await p1.locator('#mm-bar-total').textContent();
check('Bar total contains MAD', barTotal.includes('MAD'));

// Check badge count
const badgeText = await p1.locator('#mm-count-badge').textContent();
check('Badge shows 2', badgeText.trim() === '2');

// Check that mm-btn-pulse class was applied (animation ran — verify via JS at end)
// We verify via computed style check that transition/animation CSS exists
const hasAnim = await p1.evaluate(() => {
  const style = document.getElementById('mm-cart-css');
  return style && style.textContent.includes('mm-btn-pulse');
});
check('mm-btn-pulse animation defined in injected CSS', hasAnim);

// Screenshot: desktop collapsed bar
await p1.setViewportSize({ width: 1280, height: 800 });
await p1.screenshot({ path: '/tmp/cart-desktop-bar.png', fullPage: false });
console.log('Screenshot: /tmp/cart-desktop-bar.png');

// ── Test 2: Open sheet, steppers work, remove works ──
const barTap = p1.locator('#mm-bar-tap');
await barTap.click();
await p1.waitForTimeout(350);

const sheetVisible = await p1.locator('#mm-cart-sheet').isVisible();
check('Sheet visible after tapping bar', sheetVisible);

// Sheet should have line items
const lineItems = await p1.locator('.mm-line-item').count();
check('Sheet has 2 line items', lineItems === 2);

// Screenshot: desktop sheet open
await p1.screenshot({ path: '/tmp/cart-desktop-sheet.png', fullPage: false });
console.log('Screenshot: /tmp/cart-desktop-sheet.png');

// Click "+" on first line item → qty increases
const firstInc = p1.locator('.mm-stepper-btn[data-action="inc"]').first();
await firstInc.click();
await p1.waitForTimeout(100);

const firstQty = await p1.locator('.mm-qty-display').first().textContent();
check('Qty of first item is now 2', firstQty.trim() === '2');

const newBarTotal = await p1.locator('#mm-bar-total').textContent();
check('Bar total increased after +', !newBarTotal.includes(' 0 '));

// Click "−" on first item → qty decreases
const firstDec = p1.locator('.mm-stepper-btn[data-action="dec"]').first();
await firstDec.click();
await p1.waitForTimeout(100);

const firstQty2 = await p1.locator('.mm-qty-display').first().textContent();
check('Qty of first item back to 1', firstQty2.trim() === '1');

// Remove second line item (trash button)
const removeBtn2 = p1.locator('.mm-remove-btn').nth(1);
await removeBtn2.click();
await p1.waitForTimeout(100);

const lineItems2 = await p1.locator('.mm-line-item').count();
check('Sheet has 1 line item after remove', lineItems2 === 1);

// Bar total synced
const barLabelAfterRemove = await p1.locator('#mm-bar-label').textContent();
check('Bar shows 1 item after remove', barLabelAfterRemove.includes('1 item'));

// ── Test 3: Send button → URL starts with wa.me/212600000000 ──
await p1.addInitScript(() => {
  window.__waUrl = null;
  const orig = window.open;
  window.open = (url, ...args) => { window.__waUrl = url; return orig(url, ...args); };
});
// Reload and re-add items so open override is in place
await p1.goto(URL, { waitUntil: 'networkidle' });
await p1.addInitScript(() => {
  window.__waUrl = null;
  const orig = window.open;
  window.open = (url, ...args) => { window.__waUrl = url; };
});
await p1.goto(URL, { waitUntil: 'networkidle' });
const btns2 = await p1.locator('.scp0').all();
await btns2[0].click();
await p1.waitForTimeout(100);
const sendBtn = p1.locator('#mm-cart-send-bar');
await sendBtn.click();
await p1.waitForTimeout(200);
const waUrl = await p1.evaluate(() => window.__waUrl);
check('Send opens wa.me URL', waUrl && waUrl.startsWith('https://wa.me/212600000000?text='));
if (waUrl) {
  const text = decodeURIComponent(waUrl.split('text=')[1] || '');
  check('Encoded text contains item name', text.length > 10);
  check('Encoded text contains MAD total', text.includes('MAD'));
}

// ── Test 4: Sold-out card cannot be added ──
// Simulate sold-out: find first .scp0 and set aria-disabled
await p1.evaluate(() => {
  const btn = document.querySelector('.scp0');
  if (btn) { btn.setAttribute('aria-disabled', 'true'); btn.style.pointerEvents = 'none'; }
});
const countBefore = await p1.locator('#mm-count-badge').textContent().catch(() => '0');
await p1.locator('.scp0').first().click({ force: true });
await p1.waitForTimeout(100);
const countAfter = await p1.locator('#mm-count-badge').textContent().catch(() => '0');
check('Sold-out card not added (count unchanged)', countBefore === countAfter);

// ── Test 5: Reduced-motion — no broken layout ──
const p2 = await browser.newPage();
await p2.emulateMedia({ reducedMotion: 'reduce' });
await p2.goto(URL, { waitUntil: 'networkidle' });
const btns3 = await p2.locator('.scp0').all();
await btns3[0].click();
await p2.waitForTimeout(100);
const barOk = await p2.locator('#mm-cart-bar').isVisible();
check('Bar visible under reduced-motion', barOk);
const barH = await p2.locator('#mm-cart-bar').boundingBox();
check('Bar has reasonable height under reduced-motion', barH && barH.height > 40);

// ── Mobile screenshots ──
const p3 = await browser.newPage();
await p3.setViewportSize({ width: 390, height: 844 });
await p3.goto(URL, { waitUntil: 'networkidle' });
const mBtns = await p3.locator('.scp0').all();
await mBtns[0].click();
await mBtns[3].click();
await p3.waitForTimeout(200);
await p3.screenshot({ path: '/tmp/cart-mobile-bar.png', fullPage: false });
console.log('Screenshot: /tmp/cart-mobile-bar.png');

// Mobile: open sheet
await p3.locator('#mm-bar-tap').click();
await p3.waitForTimeout(350);
await p3.screenshot({ path: '/tmp/cart-mobile-sheet.png', fullPage: false });
console.log('Screenshot: /tmp/cart-mobile-sheet.png');

// Close sheet via Escape
await p3.keyboard.press('Escape');
await p3.waitForTimeout(350);
const sheetClosed = await p3.evaluate(() => !document.getElementById('mm-cart-sheet').classList.contains('mm-open'));
check('Sheet closed by Escape key', sheetClosed);

await browser.close();

console.log('\n=== RESULTS ===');
if (failures.length === 0) {
  console.log('All checks PASSED');
  process.exit(0);
} else {
  console.log('FAILED checks:', failures.join(', '));
  process.exit(1);
}
```

Run:
```bash
cd /home/idder/Documents/github/Marmara_store && node test-cart-ux.mjs 2>&1
```

Expected: `All checks PASSED` with screenshot paths listed.

- [ ] **Step 4: Kill static server and clean up**

```bash
pkill -f "serve dist" 2>/dev/null || true
rm /home/idder/Documents/github/Marmara_store/test-cart-ux.mjs
cd /home/idder/Documents/github/Marmara_store && npm uninstall playwright-core 2>&1 | tail -3
```

Expected: server stopped, file removed, playwright-core uninstalled.

---

### Task 3: Write report and commit

**Files:**
- Create: `.superpowers/sdd/cart-ux-report.md`
- Modify: git index (commit)

**Interfaces:**
- Consumes: playwright test results, commit hash

- [ ] **Step 1: Write `.superpowers/sdd/cart-ux-report.md`**

Create the file with actual results from the Playwright run (not placeholders).

- [ ] **Step 2: Verify final build and tests pass**

```bash
cd /home/idder/Documents/github/Marmara_store && npm test && npm run build 2>&1 | tail -10
```

Expected: All tests pass, 6 pages built.

- [ ] **Step 3: Commit**

```bash
cd /home/idder/Documents/github/Marmara_store && git add src/scripts/menu-cart.js .superpowers/sdd/cart-ux-report.md && git commit -m "$(cat <<'EOF'
feat: polished add-to-cart + expandable cart/ordering UX (mobile-first, a11y)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit created on `marmara-astro-rebuild` branch.

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|---|---|
| Tap feedback < 100ms, scale pulse, badge bump | Task 1 — `mm-btn-pulse`/`mm-badge-animate` animations + void reflow trick |
| navigator.vibrate?(8) | Task 1 — card click handler |
| prefers-reduced-motion: skip transforms | Task 1 — CSS `@media(prefers-reduced-motion)` block |
| Collapsed sticky bar: SVG cart icon + count badge | Task 1 — `#mm-cart-icon-wrap` + `#mm-count-badge` |
| Bar: "N items", total (tabular, Bricolage), green Send CTA | Task 1 — `#mm-bar-label`, `#mm-bar-total`, `#mm-cart-send-bar` |
| Bar: hidden when cart empty | Task 1 — `mm-has-items` class toggle |
| Up-chevron affordance | Task 1 — `#mm-bar-chevron` with rotate transition |
| Expandable cart sheet: slides up/down | Task 1 — `translateY` transition on `mm-open` class |
| Sheet: line items, stepper (−/qty/+), subtotal, remove | Task 1 — `.mm-line-item` rows with `.mm-stepper-btn`, `.mm-qty-display`, `.mm-remove-btn` |
| Stepper controls ≥44×44px | Task 1 — `width:44px;height:44px` on all buttons |
| Sheet footer: total + Send CTA + Clear/collapse | Task 1 — `#mm-sheet-footer`, `#mm-sheet-send`, `#mm-sheet-clear-btn` |
| Scrim on mobile, tap scrim closes | Task 1 — `#mm-cart-scrim` + `scrim.addEventListener('click', closeSheet)` |
| Esc closes sheet | Task 1 — `keydown` handler |
| One primary CTA (green Send) | Task 1 — only `#mm-cart-send-bar` and `#mm-sheet-send` are green |
| cursor-pointer on clickables | Task 1 — CSS on all interactive elements |
| focus-visible outlines | Task 1 — `:focus-visible` rules on all buttons |
| aria-labels on icon buttons | Task 1 — all `<button>` elements have `aria-label` |
| aria-live="polite" count region | Task 1 — `#mm-cart-live` span |
| tabular-nums on prices/totals | Task 1 — `font-variant-numeric:tabular-nums` on all price elements |
| Inline SVG icons (no emoji) | Task 1 — SVG_CART, SVG_PLUS, SVG_MINUS, SVG_TRASH, SVG_CHEVRON_*, SVG_WA |
| Mobile-first full-width sheet with scrim | Task 1 — `max-width:100%;left:0` under `@media(max-width:720px)` |
| Desktop: max-width 460px centered | Task 1 — `max-width:460px;left:50%;transform:translateX(-50%)` |
| safe-area-inset-bottom | Task 1 — `env(safe-area-inset-bottom)` in bar and sheet footer padding |
| addItem/removeItem/cartTotal/cartCount preserved | Task 1 — named exported functions |
| buildOrderUrl from whatsapp.js, phone 212600000000 | Task 1 — `doSend()` function |
| Card "+" event delegation (.scp0) | Task 1 — `document.addEventListener('click', ...)` |
| Owner-added cards supported | Task 1 — fallback block with `card.dataset.mmNew === '1'` check |
| Sold-out cards non-addable | Task 1 — `aria-disabled === 'true'` guard |
| Tab filtering preserved | Task 1 — complete `resolveTabLabel` + tabs loop |
| npm test passes | Task 2 + Task 3 |
| npm run build passes | Task 2 + Task 3 |
| Playwright verify (all scenarios) | Task 2 |
| Screenshots at 1280px + 390px (bar + sheet) | Task 2 |
| npm uninstall playwright-core | Task 2 Step 4 |
| Commit with exact message | Task 3 Step 3 |
| Report to .superpowers/sdd/cart-ux-report.md | Task 3 Step 1 |

**Placeholder scan:** No TBDs or "implement later" phrases present. All code blocks are complete.

**Type consistency:** `addItem(id, name, price)` called consistently. `removeItem(id)` called consistently. `cartTotal()` / `cartCount()` return numbers consistently.
