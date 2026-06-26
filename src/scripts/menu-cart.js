import menuData from '../data/menu.json';
import siteData from '../data/site.json';
import { buildOrderUrl } from './whatsapp.js';

// ─── item lookup ────────────────────────────────────────────────────────────
const menuById = Object.fromEntries(menuData.map((item) => [item.id, item]));

// ─── tab-label → category-key resolution ────────────────────────────────────
// Build a word → category-key map from site.json categories
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
  // partial: tab label word appears in map
  for (const word of norm.split(/\s+/)) {
    if (word.length > 2 && wordToCat[word]) return wordToCat[word];
  }
  // partial: a map key appears in the tab label
  for (const [k, v] of Object.entries(wordToCat)) {
    if (norm.includes(k)) return v;
  }
  return null; // unmapped – no-op
}

// ─── cart state ──────────────────────────────────────────────────────────────
let cart = [];

// ─── cart bar ────────────────────────────────────────────────────────────────
const cartBar = document.createElement('div');
cartBar.id = 'mm-cart-bar';
Object.assign(cartBar.style, {
  position: 'fixed',
  bottom: '0',
  left: '0',
  right: '0',
  zIndex: '999',
  background: 'rgb(24, 20, 16)',
  color: 'rgb(255, 255, 255)',
  padding: '14px 28px',
  display: 'none',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  fontFamily: '"Hanken Grotesk", sans-serif',
  boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
  boxSizing: 'border-box',
});

cartBar.innerHTML = `
  <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;overflow:hidden;">
    <span id="mm-cart-count" style="font-weight:700;font-size:15px;white-space:nowrap;"></span>
    <span style="color:rgba(255,255,255,0.3);">&middot;</span>
    <span id="mm-cart-total" style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:18px;white-space:nowrap;"></span>
  </div>
  <div style="display:flex;gap:10px;align-items:center;flex-shrink:0;">
    <button id="mm-cart-clear"
      style="background:transparent;border:1.5px solid rgba(255,255,255,0.35);color:rgba(255,255,255,0.85);
             font-weight:600;font-size:14px;padding:9px 16px;border-radius:999px;cursor:pointer;
             font-family:inherit;line-height:1;">Clear</button>
    <button id="mm-cart-send"
      style="background:rgb(37,211,102);border:none;color:#fff;font-weight:700;font-size:15px;
             padding:11px 20px;border-radius:999px;cursor:pointer;font-family:inherit;
             display:flex;align-items:center;gap:7px;line-height:1;">
      <span style="font-size:15px;">&#x1F4AC;</span> Send order on WhatsApp
    </button>
  </div>
`;
document.body.appendChild(cartBar);

const countEl = document.getElementById('mm-cart-count');
const totalEl = document.getElementById('mm-cart-total');

function renderCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  cartBar.style.display = count === 0 ? 'none' : 'flex';
  countEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;
  totalEl.textContent = `${total} MAD`;
}

document.getElementById('mm-cart-clear').addEventListener('click', () => {
  cart = [];
  renderCart();
});

document.getElementById('mm-cart-send').addEventListener('click', () => {
  if (!cart.length) return;
  window.open(buildOrderUrl(cart, { phone: '212600000000' }), '_blank');
});

// ─── discover cards ───────────────────────────────────────────────────────────
const imageSlots = Array.from(document.querySelectorAll('image-slot[id^="mphoto-"]'));
if (imageSlots.length === 0) {
  // no cards on this page – still render (empty) bar so button wiring is done
  renderCart();
} else {
  // card element is 2 levels up from the image-slot:
  //   <card>  <image-container>  <image-slot>
  const cardMap = new Map(); // card el → { id, category, name, price }
  for (const slot of imageSlots) {
    const itemId = slot.id.slice('mphoto-'.length);
    const item = menuById[itemId];
    if (!item) continue;
    const card = slot.parentElement?.parentElement;
    if (!card) continue;
    // avoid duplicate entries (home page may repeat same item id)
    if (!cardMap.has(card)) {
      cardMap.set(card, {
        id: itemId,
        category: item.category,
        name: item.name,
        price: item.price,
      });
    }
  }

  // ─── also discover owner-added cards injected by public-menu-sync.js ────
  // These have data-mm-new="1" and their image-slot id is NOT in menu.json.
  for (const slot of imageSlots) {
    const itemId = slot.id.slice('mphoto-'.length);
    if (menuById[itemId]) continue; // already handled above
    const card = slot.parentElement?.parentElement;
    if (!card || cardMap.has(card)) continue;
    if (card.dataset.mmNew !== '1') continue; // only owner-added cards

    const catKey = card.dataset.mmCategory || '';
    // Read name and price from the card DOM (same layout as baked cards)
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

  // ─── wire + buttons via event delegation ─────────────────────────────────
  // Event delegation handles both baked cards (pre-discovered) and owner-added
  // cards injected by public-menu-sync.js after this module has loaded.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.scp0');
    if (!btn) return;
    // Respect sold-out / aria-disabled state
    if (btn.getAttribute('aria-disabled') === 'true') return;

    // Walk up: btn → priceRow → contentDiv → card
    const card = btn.parentElement?.parentElement?.parentElement;
    if (!card) return;

    // Look up card data from the map built above (covers baked + pre-discovered new cards)
    let data = cardMap.get(card);

    // Fallback: dynamically-injected card not yet in cardMap
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
      cardMap.set(card, data); // cache so tab filtering picks it up too
    }

    if (!data) return;
    e.stopPropagation();

    const existing = cart.find((i) => i.id === data.id);
    if (existing) {
      cart = cart.map((i) =>
        i.id === data.id ? { ...i, qty: i.qty + 1 } : i
      );
    } else {
      cart = [
        ...cart,
        { id: data.id, name: data.name, price: data.price, qty: 1 },
      ];
    }
    renderCart();
  });

  // ─── detect layout: single flat grid vs. multiple category sections ──────
  // If cards live in more than one parent grid, we have category sections.
  const grids = new Set(
    Array.from(cardMap.keys()).map((c) => c.parentElement)
  );
  const isMultiSection = grids.size > 1;

  // ─── tab filtering ───────────────────────────────────────────────────────
  // Tabs: div[cursor:pointer][font-weight:700][font-size:15px][padding:10px 20px][border-radius:999px]
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

        // Update active-tab styles
        for (const t of tabs) {
          t.style.background = 'rgb(255, 255, 255)';
          t.style.color = 'rgb(59, 53, 45)';
        }
        tab.style.background = 'rgb(24, 20, 16)';
        tab.style.color = 'rgb(255, 255, 255)';

        if (!catKey) return; // unmapped label – no visual change beyond active tab

        // Show / hide individual cards
        for (const [card, data] of cardMap) {
          const show = catKey === 'all' || data.category === catKey;
          card.style.display = show ? '' : 'none';
        }

        // On the menu page, hide empty category sections (grid's parent)
        if (isMultiSection) {
          // Build: grid el → [cards]
          const gridCards = new Map();
          for (const card of cardMap.keys()) {
            const g = card.parentElement;
            if (!g) continue;
            if (!gridCards.has(g)) gridCards.set(g, []);
            gridCards.get(g).push(card);
          }
          for (const [grid, cards] of gridCards) {
            const section = grid.parentElement; // category section wrapper
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
