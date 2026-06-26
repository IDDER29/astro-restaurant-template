/**
 * public-catering-sync.js
 *
 * Reads `marmara_catering_packages` from localStorage (written by the owner
 * dashboard) and updates the public /catering page package cards to reflect
 * the current name, serves, price, what's-included lines, and featured marker.
 *
 * Mirrors the pattern of public-menu-sync.js — additive, never modifies
 * markup files, safe to coexist with other scripts.
 */

/**
 * Parse a raw JSON string from localStorage into a catering packages array.
 * Exported for unit testing.
 *
 * @param {string|null} raw
 * @returns {Array|null}
 */
export function parseCateringPackages(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

/**
 * Apply dashboard catering package overrides to every package card on the
 * current /catering page. Safe to call multiple times (idempotent per load).
 */
export function syncCateringPackages() {
  try {
    const raw = localStorage.getItem('marmara_catering_packages');
    if (!raw) return;
    const pkgs = parseCateringPackages(raw);
    if (!pkgs) return;

    const cards = Array.from(document.querySelectorAll('[data-dc-tpl="46"] [data-dc-tpl="48"]'));
    if (!cards.length) return;

    pkgs.forEach((pkg, i) => {
      try {
        const card = cards[i];
        if (!card) return;

        // Name
        const nameEl = card.querySelector('[data-dc-tpl="52"] .sc-interp');
        if (nameEl && typeof pkg.name === 'string' && pkg.name !== '') {
          nameEl.textContent = pkg.name;
        }

        // Serves
        const servesEl = card.querySelector('[data-dc-tpl="53"] .sc-interp');
        if (servesEl && typeof pkg.serves === 'string' && pkg.serves !== '') {
          // Normalize: if value already starts with "Serves", use as-is; otherwise prepend
          const servesText = pkg.serves.startsWith('Serves') ? pkg.serves : 'Serves ' + pkg.serves;
          servesEl.textContent = servesText;
        }

        // Price
        const priceEl = card.querySelector('[data-dc-tpl="55"] .sc-interp');
        if (priceEl && pkg.price !== undefined && pkg.price !== '') {
          priceEl.textContent = String(pkg.price);
        }

        // Featured / "Most booked" badge + card dark styling
        const badgeEl = card.querySelector('[data-dc-tpl="50"]');
        if (pkg.featured) {
          // Show badge
          if (!badgeEl) {
            const badge = document.createElement('div');
            badge.setAttribute('data-dc-tpl', '50');
            badge.style.cssText =
              'position: absolute; top: 22px; right: 22px; background: rgb(255, 138, 30); color: rgb(21, 17, 13); font-weight: 700; font-size: 12px; padding: 5px 12px; border-radius: 999px; letter-spacing: 0.02em;';
            badge.textContent = 'Most booked';
            card.appendChild(badge);
          }
          // Apply dark card styling
          card.style.background = 'rgb(21, 17, 13)';
          card.style.borderColor = 'rgb(21, 17, 13)';
        } else {
          // Remove badge
          if (badgeEl) badgeEl.remove();
          // Restore light card styling
          card.style.background = 'rgb(255, 255, 255)';
          card.style.borderColor = 'rgb(239, 231, 216)';
        }

        // What's included lines
        if (Array.isArray(pkg.lines)) {
          const linesContainer = card.querySelector('[data-dc-tpl="57"]');
          if (linesContainer) {
            // Update existing lines; add/remove as needed
            const existingRows = Array.from(linesContainer.querySelectorAll('[data-dc-tpl="59"]'));
            pkg.lines.forEach((lineText, j) => {
              if (j < existingRows.length) {
                const textEl = existingRows[j].querySelector('.sc-interp');
                if (textEl) textEl.textContent = lineText;
              } else {
                // Add new line row
                const row = document.createElement('div');
                row.setAttribute('data-dc-tpl', '59');
                row.style.cssText =
                  'display: flex; gap: 10px; align-items: flex-start; font-size: 14.5px; color: rgb(59, 53, 45);';
                const check = document.createElement('span');
                check.setAttribute('data-dc-tpl', '60');
                check.style.cssText = 'color: rgb(118, 192, 67); font-weight: 700;';
                check.textContent = '✓';
                const text = document.createElement('span');
                text.classList.add('sc-interp');
                text.textContent = lineText;
                row.appendChild(check);
                row.appendChild(text);
                linesContainer.appendChild(row);
              }
            });
            // Remove excess rows
            for (let j = pkg.lines.length; j < existingRows.length; j++) {
              existingRows[j].remove();
            }
          }
        }

        // CTA button text ("Choose <name>")
        const ctaEl = card.querySelector('[data-dc-tpl="61"] .sc-interp');
        if (ctaEl && typeof pkg.name === 'string' && pkg.name !== '') {
          ctaEl.textContent = 'Choose ' + pkg.name;
        }
      } catch (_cardErr) {
        // Skip this card silently
      }
    });
  } catch (_outerErr) {
    // localStorage unavailable — no-op
  }
}

// Run only in browser contexts (guard for vitest node environment)
if (typeof window !== 'undefined') {
  syncCateringPackages();
}
