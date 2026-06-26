/**
 * public-menu-sync.js
 *
 * Reads `marmara_menu_plates` from localStorage (written by the owner
 * dashboard) and:
 *   1. Updates every baked-in menu card to reflect the dashboard's current
 *      name / description / price / availability.
 *   2. Injects entirely new cards (plates whose names are NOT in menu.json)
 *      into the correct category section so they appear as orderable cards.
 *
 * Matching strategy: canonical name from menu.json (keyed by ITEMID in
 * the card's image-slot id) looked up case-insensitively against the
 * dashboard plate list.
 *
 * This module is additive — it never changes markup files and is
 * designed to coexist safely with menu-cart.js.
 * IMPORTANT: must run BEFORE menu-cart.js so new cards are in the DOM
 * when menu-cart.js discovers and wires them.
 */

import menuData from '../data/menu.json';

/** Map: menu.json item id → item object */
const menuById = Object.fromEntries(menuData.map((item) => [item.id, item]));

/** Set of baked-in plate names (lower-case) derived from menu.json */
const bakedNames = new Set(Object.values(menuById).map((item) => item.name.trim().toLowerCase()));

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
 * Given a list of dashboard plates and a Set of baked-in name keys
 * (lower-cased), return only the plates that are owner-added (not baked in).
 * Exported for unit testing.
 *
 * @param {Array<any>} plates
 * @param {Set<string>} bakedNameSet
 * @returns {Array<object>}
 */
export function filterNewPlates(plates, bakedNameSet) {
  if (!Array.isArray(plates)) return [];
  return plates.filter((p) => {
    if (!p || typeof p.name !== 'string') return false;
    return !bakedNameSet.has(p.name.trim().toLowerCase());
  });
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

        // ── Image ────────────────────────────────────────────────────────
        const existingPlateImg = slot.querySelector('[data-mm-plate-img]');
        if (plate.image) {
          if (existingPlateImg) {
            existingPlateImg.src = plate.image;
          } else {
            const img = document.createElement('img');
            img.dataset.mmPlateImg = '1';
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
            img.src = plate.image;
            slot.appendChild(img);
          }
        } else if (existingPlateImg) {
          existingPlateImg.remove();
        }

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

/**
 * Inject new owner-added cards into the public menu DOM.
 * Called once per page load, after syncMenuCards().
 * For each plate in localStorage whose name is NOT in menu.json, this:
 *   - Finds (or skips) the category section grid
 *   - Deep-clones an existing card from that grid as a visual template
 *   - Patches the clone: image-slot id, name, desc, price, popular badge,
 *     sold-out state
 *   - Tags the clone with data-mm-new="1" and data-mm-category for
 *     menu-cart.js to pick up
 *   - Appends the clone to the category grid
 */
function injectNewPlates() {
  try {
    const raw = localStorage.getItem('marmara_menu_plates');
    if (!raw) return;

    let plates;
    try {
      plates = JSON.parse(raw);
    } catch (_) {
      return;
    }
    if (!Array.isArray(plates) || plates.length === 0) return;

    const newPlates = filterNewPlates(plates, bakedNames);
    if (newPlates.length === 0) return;

    // Build category key → grid element map from existing baked-in cards
    const catGridMap = new Map();
    const existingSlots = document.querySelectorAll('image-slot[id^="mphoto-"]');
    for (const slot of existingSlots) {
      const itemId = slot.id.slice('mphoto-'.length);
      const item = menuById[itemId];
      if (!item) continue;
      const card = slot.parentElement?.parentElement; // div[data-dc-tpl="39"]
      const grid = card?.parentElement; // div[data-dc-tpl="37"]
      if (grid && !catGridMap.has(item.category)) {
        catGridMap.set(item.category, grid);
      }
    }

    for (const plate of newPlates) {
      try {
        // Skip if already injected (idempotent)
        if (document.getElementById('mphoto-' + plate.id)) continue;

        const targetGrid = catGridMap.get(plate.category);
        if (!targetGrid) continue; // no matching section — skip gracefully

        const templateCard = targetGrid.querySelector('[data-dc-tpl="39"]');
        if (!templateCard) continue;

        // Deep-clone the template card to inherit correct category colors
        const clone = templateCard.cloneNode(true);
        clone.dataset.mmNew = '1';
        clone.dataset.mmCategory = plate.category;

        // ── Image slot ──────────────────────────────────────────────────
        const slotEl = clone.querySelector('image-slot[id^="mphoto-"]');
        if (slotEl) {
          slotEl.id = 'mphoto-' + plate.id;
          slotEl.setAttribute('placeholder', '[ ' + plate.name + ' ]');
          if (plate.image) {
            const img = document.createElement('img');
            img.dataset.mmPlateImg = '1';
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
            img.src = plate.image;
            slotEl.appendChild(img);
          }
        }

        // ── Popular badge ───────────────────────────────────────────────
        const imgContainer = clone.querySelector('[data-dc-tpl="40"]');
        const existingPopBadge = clone.querySelector('[data-dc-tpl="43"]');
        if (plate.popular && !existingPopBadge && imgContainer) {
          const badge = document.createElement('div');
          badge.setAttribute('data-dc-tpl', '43');
          badge.style.cssText =
            'position: absolute; top: 12px; left: 12px; background: rgb(24, 20, 16);' +
            ' color: rgb(255, 255, 255); font-size: 11px; font-weight: 700;' +
            ' padding: 5px 11px; border-radius: 999px; letter-spacing: 0.02em;';
          badge.textContent = '★ Popular';
          imgContainer.appendChild(badge);
        } else if (!plate.popular && existingPopBadge) {
          existingPopBadge.remove();
        }

        // ── Text fields (same DOM walk as syncMenuCards) ────────────────
        const addBtn = clone.querySelector('.scp0');
        const priceRow = addBtn?.parentElement;
        if (priceRow) {
          const priceDiv = priceRow.children[0];
          const priceSpan = priceDiv?.querySelector('.sc-interp');
          if (priceSpan) priceSpan.textContent = plate.price + ' MAD';

          const contentDiv = priceRow.parentElement;
          const nameSpan = contentDiv?.children[0]?.querySelector('.sc-interp');
          const descSpan = contentDiv?.children[1]?.querySelector('.sc-interp');
          if (nameSpan) nameSpan.textContent = plate.name;
          if (descSpan) descSpan.textContent = plate.desc || '';
        }

        // ── Availability ────────────────────────────────────────────────
        // Remove any sold-out badge left over from the template
        const templateSoldOut = clone.querySelector('[data-marmara-sold-out]');
        if (templateSoldOut) templateSoldOut.remove();
        clone.style.opacity = '';
        if (addBtn) {
          addBtn.style.pointerEvents = '';
          addBtn.style.cursor = '';
          addBtn.removeAttribute('aria-disabled');
        }

        if (plate.available === false) {
          clone.style.opacity = '0.5';
          if (addBtn) {
            addBtn.style.pointerEvents = 'none';
            addBtn.style.cursor = 'default';
            addBtn.setAttribute('aria-disabled', 'true');
          }
          if (imgContainer) {
            const soldOut = document.createElement('div');
            soldOut.dataset.marmaraSoldOut = '1';
            soldOut.textContent = 'Sold out';
            soldOut.style.cssText =
              'position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.72);' +
              'color:#fff;font-size:11px;font-weight:700;padding:5px 11px;' +
              'border-radius:999px;letter-spacing:0.02em;z-index:2;pointer-events:none;';
            imgContainer.appendChild(soldOut);
          }
        }

        targetGrid.appendChild(clone);
      } catch (_plateErr) {
        // Skip this plate silently — never break other cards
      }
    }
  } catch (_outerErr) {
    // localStorage unavailable or other error — no-op
  }
}

// Run only in browser contexts (guard for vitest node environment)
if (typeof window !== 'undefined') {
  syncMenuCards();
  injectNewPlates();
}
