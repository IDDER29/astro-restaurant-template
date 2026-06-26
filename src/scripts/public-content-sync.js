/**
 * public-content-sync.js
 *
 * Reads `marmara_site_content` from localStorage (written by the owner
 * dashboard) and updates the public page DOM to reflect the current
 * hero badge, headline, sub-text, promo banner, about story, and belief
 * section content.
 *
 * Mirrors the pattern of public-menu-sync.js — additive, never modifies
 * markup files, safe to coexist with other scripts.
 */

/** Map: storage key → CSS selector for the public page DOM element */
const FIELD_SELECTORS = {
  heroBadge:     '[data-dc-tpl="26"] .sc-interp',
  heroHeadline:  '[data-dc-tpl="28"] .sc-interp',
  heroSub:       '[data-dc-tpl="29"] .sc-interp',
  promoText:     '[data-dc-tpl="8"] .sc-interp',
  aboutStory:    '[data-dc-tpl="24"] .sc-interp',
  beliefHeading: '[data-dc-tpl="35"] .sc-interp',
  beliefBody:    '[data-dc-tpl="36"] .sc-interp',
};

/**
 * Parse a raw JSON string into a site-content object.
 * Returns the parsed object if valid and non-null object type, or null otherwise.
 * Exported for unit testing.
 *
 * @param {string|null} raw
 * @returns {object|null}
 */
export function parseSiteContent(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

/**
 * Read marmara_site_content from localStorage and apply it to the
 * current public page DOM.  Safe to call multiple times (idempotent).
 */
export function syncSiteContent() {
  try {
    const raw = localStorage.getItem('marmara_site_content');
    if (!raw) return; // no dashboard data — leave baked-in values intact

    const content = parseSiteContent(raw);
    if (!content) return;

    for (const [key, selector] of Object.entries(FIELD_SELECTORS)) {
      try {
        const value = content[key];
        if (typeof value !== 'string' || value === '') continue;
        const el = document.querySelector(selector);
        if (el) el.textContent = value;
      } catch (_fieldErr) {
        // Skip this field silently — never break other fields
      }
    }
  } catch (_outerErr) {
    // localStorage unavailable (private browsing, storage quota, etc.) — no-op
  }
}

// Run only in browser contexts (guard for vitest node environment)
if (typeof window !== 'undefined') {
  syncSiteContent();
}
