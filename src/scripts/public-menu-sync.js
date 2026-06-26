/**
 * public-menu-sync.js
 *
 * Reads `marmara_menu_plates` from localStorage (written by the owner
 * dashboard) and updates every public menu card on the page to reflect
 * the dashboard's current name / description / price / availability.
 *
 * Matching strategy: canonical name from menu.json (keyed by ITEMID in
 * the card's image-slot id) looked up case-insensitively against the
 * dashboard plate list.
 *
 * This module is additive — it never changes markup files and is
 * designed to coexist safely with menu-cart.js.
 */

import menuData from '../data/menu.json';

/** Map: menu.json item id → item object */
const menuById = Object.fromEntries(menuData.map((item) => [item.id, item]));

/**
 * Build a case-insensitive name → plate map from a dashboard plates array.
 * Exported for unit testing.
 *
 * @param {Array<{name: string, [key: string]: any}>} plates
 * @returns {Map<string, object>}
 */
export function buildNameMap(plates) {
  const map = new Map();
  for (const plate of plates) {
    if (plate && typeof plate.name === 'string') {
      map.set(plate.name.trim().toLowerCase(), plate);
    }
  }
  return map;
}

/**
 * Apply dashboard overrides to every card on the current page.
 * Safe to call multiple times (idempotent per page load).
 */
function syncMenuCards() {
  try {
    const raw = localStorage.getItem('marmara_menu_plates');
    if (!raw) return; // no dashboard data — leave baked-in values intact

    let plates;
    try {
      plates = JSON.parse(raw);
    } catch (_) {
      return; // malformed JSON — bail out silently
    }
    if (!Array.isArray(plates) || plates.length === 0) return;

    const nameMap = buildNameMap(plates);

    const imageSlots = Array.from(
      document.querySelectorAll('image-slot[id^="mphoto-"]')
    );

    for (const slot of imageSlots) {
      try {
        // Resolve which menu.json item this card represents
        const itemId = slot.id.slice('mphoto-'.length);
        const item = menuById[itemId];
        if (!item) continue;

        // Find the matching dashboard plate by canonical name
        const plate = nameMap.get(item.name.trim().toLowerCase());
        if (!plate) continue;

        // Card is two levels up:  card → image-container → image-slot
        const imageContainer = slot.parentElement;
        const card = imageContainer?.parentElement;
        if (!card) continue;

        // Locate the add (+) button, then walk up to find price / name / desc
        const addBtn = card.querySelector('.scp0');
        const priceRow = addBtn?.parentElement; // flex row: [priceDiv, addBtn]
        if (!priceRow) continue;

        // Price span (first child of priceRow)
        const priceDiv = priceRow.children[0];
        const priceSpan = priceDiv?.querySelector('.sc-interp');

        // Content container holds: [nameDiv, descDiv, priceRow]
        const contentDiv = priceRow.parentElement;
        const nameSpan = contentDiv?.children[0]?.querySelector('.sc-interp');
        const descSpan = contentDiv?.children[1]?.querySelector('.sc-interp');

        // ── Update text ──────────────────────────────────────────────────
        if (priceSpan) priceSpan.textContent = `${plate.price} MAD`;
        if (nameSpan) nameSpan.textContent = plate.name;
        if (descSpan) descSpan.textContent = plate.desc;

        // ── Availability ─────────────────────────────────────────────────
        const soldOutAttr = '[data-marmara-sold-out]';
        const existingBadge = imageContainer?.querySelector(soldOutAttr);

        if (plate.available === false) {
          // Dim the whole card
          card.style.opacity = '0.5';

          // Disable the add-to-cart button (inert, not removed, so menu-cart
          // still binds it; pointer-events:none prevents click)
          if (addBtn) {
            addBtn.style.pointerEvents = 'none';
            addBtn.style.cursor = 'default';
            addBtn.setAttribute('aria-disabled', 'true');
          }

          // Inject "Sold out" badge into the image container if not present
          if (imageContainer && !existingBadge) {
            const badge = document.createElement('div');
            badge.dataset.marmaraSoldOut = '1';
            badge.textContent = 'Sold out';
            badge.style.cssText =
              'position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.72);' +
              'color:#fff;font-size:11px;font-weight:700;padding:5px 11px;' +
              'border-radius:999px;letter-spacing:0.02em;z-index:2;pointer-events:none;';
            imageContainer.appendChild(badge);
          }
        } else {
          // Restore card to normal
          card.style.opacity = '';

          if (addBtn) {
            addBtn.style.pointerEvents = '';
            addBtn.style.cursor = '';
            addBtn.removeAttribute('aria-disabled');
          }

          if (existingBadge) existingBadge.remove();
        }
      } catch (_cardErr) {
        // Skip this card silently — never break other cards
      }
    }
  } catch (_outerErr) {
    // localStorage unavailable (private browsing, storage quota, etc.) — no-op
  }
}

// Run only in browser contexts (guard for vitest node environment)
if (typeof window !== 'undefined') {
  syncMenuCards();
}
