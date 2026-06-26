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

#mm-cart-scrim{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:997;opacity:0;pointer-events:none;transition:opacity 220ms ease}
#mm-cart-scrim.mm-open{opacity:1;pointer-events:auto}

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

#mm-cart-sheet{position:fixed;bottom:0;left:50%;transform:translateX(-50%) translateY(100%);width:100%;max-width:460px;max-height:80vh;z-index:1000;background:#FFFBF4;border-radius:24px 24px 0 0;display:flex;flex-direction:column;box-shadow:0 -8px 48px rgba(0,0,0,.22);transition:transform 280ms ease-out;will-change:transform}
#mm-cart-sheet.mm-open{transform:translateX(-50%) translateY(0)}
@media(max-width:720px){#mm-cart-sheet{max-width:100%;left:0;transform:translateY(100%)}#mm-cart-sheet.mm-open{transform:translateY(0)}}

#mm-sheet-header{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 12px;border-bottom:1px solid #EFE7D8;flex-shrink:0;gap:8px}
#mm-sheet-title{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:17px;color:#181410;flex:1;text-align:center}
#mm-sheet-close{width:44px;height:44px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:12px;transition:background 130ms;flex-shrink:0;color:#5B5247}
#mm-sheet-close:hover{background:rgba(0,0,0,.06)}
#mm-sheet-close:focus-visible{outline:2px solid #FF8A1E;outline-offset:2px}
#mm-sheet-clear-btn{border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:12px;transition:background 130ms,color 130ms;flex-shrink:0;color:rgba(24,20,16,.45);font-family:'Hanken Grotesk',sans-serif;font-size:13px;font-weight:600;padding:10px 8px;height:44px}
#mm-sheet-clear-btn:hover{background:rgba(0,0,0,.06);color:rgba(24,20,16,.8)}
#mm-sheet-clear-btn:focus-visible{outline:2px solid #FF8A1E;outline-offset:2px}

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

@keyframes mm-badge-bump{0%,100%{transform:scale(1)}50%{transform:scale(1.55)}}
@keyframes mm-btn-pulse{0%{transform:scale(1)}60%{transform:scale(1.12)}100%{transform:scale(1)}}
.mm-badge-animate{animation:mm-badge-bump 240ms ease-out}
.mm-btn-pulse{animation:mm-btn-pulse 180ms ease-out}

@media(prefers-reduced-motion:reduce){
  #mm-cart-sheet,#mm-cart-scrim,#mm-bar-chevron,#mm-count-badge,#mm-cart-send-bar,#mm-sheet-send,.mm-stepper-btn,.mm-remove-btn{transition:none!important}
  .mm-badge-animate,.mm-btn-pulse{animation:none!important}
}
`;
document.head.appendChild(mmStyle);

// ─── build DOM ────────────────────────────────────────────────────────────────
const scrim = document.createElement('div');
scrim.id = 'mm-cart-scrim';
scrim.setAttribute('aria-hidden', 'true');
document.body.appendChild(scrim);

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

    btn.classList.remove('mm-btn-pulse');
    void btn.offsetWidth;
    btn.classList.add('mm-btn-pulse');
    btn.addEventListener('animationend', () => btn.classList.remove('mm-btn-pulse'), { once: true });

    countBadgeEl.classList.remove('mm-badge-animate');
    void countBadgeEl.offsetWidth;
    countBadgeEl.classList.add('mm-badge-animate');
    countBadgeEl.addEventListener('animationend', () => countBadgeEl.classList.remove('mm-badge-animate'), { once: true });
  });

  const grids = new Set(Array.from(cardMap.keys()).map((c) => c.parentElement));
  const isMultiSection = grids.size > 1;

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
