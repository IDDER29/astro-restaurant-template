# Marmara — Astro Rebuild Design Spec

**Date:** 2026-06-26
**Status:** Approved (design), ready for implementation plan

## Context

`Marmara Restaurant Website.html` is a ~2 MB single-file export from a design-canvas
tool. It is a complete, well-designed restaurant site for **Marmara** in **Ben Guerir,
Morocco** (late-night food spot near UM6P campus), but it ships as one opaque bundle:
six pages encoded as template strings, content rendered by a React-like `DCLogic`
runtime via in-browser Babel, all assets base64-embedded. It cannot be edited or
maintained sanely, and it carries editor leftovers.

The owner of Marmara has **not** been contacted. The builder (this project's author)
is creating a polished version to (a) pitch the owner and win them as a client, and
(b) serve as a standout portfolio piece. The author is the developer.

## Goal

Rebuild the existing site as a clean, componentized **Astro** static site that looks
identical (or better) to visitors, is readable/professional in the repo, and deploys
free to a live URL. Demo/portfolio grade — not a backend product (yet).

## Decisions (locked)

- **Stack:** Astro (static output). Free static hosting (Cloudflare Pages or Netlify).
- **Scope:** Demo/portfolio grade. Keep the owner dashboard's `localStorage`
  persistence as-is (a convincing demo). No real backend, no payment/checkout.
- **Ordering:** WhatsApp-based (build an order, open `wa.me` link). Unchanged behavior.
- **Images:** The bundle contains **zero photos** — all "photos" are gradient
  placeholders. Use free stock photos (Pexels/Unsplash) of matching food, placed in
  `public/images/`, clearly swappable for the owner's real photos later.

## Architecture

```
src/
  layouts/BaseLayout.astro       <head>, SEO/meta/OG, fonts, Nav+Footer shell
  components/                    Nav, Footer, Hero, MenuCard, CartDrawer,
                                 SectionHeader, QrBlock, StatRow
  pages/  index, menu, catering, about, visit, dashboard   (.astro)
  data/   menu.json (34 items), site.json (contact/hours/links/copy)
  scripts/ cart.js, whatsapp.js, cms.js   (client islands, pure + testable)
  styles/ global.css (design tokens)
public/
  images/  stock photos          favicon.svg   og-image.png
```

- **Shared Nav/Footer** as components — removes the per-page duplication of the bundle.
- **`menu.json` is the single source of truth** for dishes (id, name, desc, price,
  category, popular). Menu page and dashboard both read it.
- **Pure logic extracted to `src/scripts/`** so it is unit-testable:
  - `whatsapp.js` — build the `wa.me` URL from a cart + phone number.
  - `cart.js` — add/remove/total over menu items.
  - `cms.js` — merge `localStorage` content overrides onto defaults (dashboard CMS).
- **Dashboard** ported with `localStorage` persistence: edits show on the editing
  device only (demo-grade; documented as such in the README).

## Design tokens (from source)

- Brand orange `#FF8A1E`; ink `#181410`; cream background `#FFFBF4`.
- Category accents: tacos `#76C043`, sandwiches `#FF3B5C`, burgers `#8B43E0`,
  breakfast `#FF8A1E`.
- Heading font: **Bricolage Grotesque** (600/700/800). Body: system sans stack.

## Real content (extracted, authoritative)

- **Contact/identity:** Marmara, "Tacos, burgers & fresh juice." Late-night food in
  Ben Guerir, ~2 min from UM6P. Dine in / takeaway / delivery.
- **Address:** 123 Avenue Hassan II, Ben Guerir 43150, Morocco.
- **Hours:** every day 9:00 AM – 1:00 AM ("Open until 1 AM").
- **Links/placeholders to keep:** WhatsApp `212600000000`, phone `+212 6 00 00 00 00`,
  Instagram `marmara.fruits`, Maps query `Marmara Restaurant Ben Guerir`. (These are
  the source's own placeholders; keep them, easy to swap when the owner provides real.)
- **Menu:** 34 items, 9 categories (breakfast, sandwiches, tacos, burgers, pizza,
  pasta, salads, crepes, drinks) — see `src/data/menu.json` (already extracted).
- **Stats:** 30+ menu items · open till 1 AM daily · 2 min from UM6P · 4.9 local rating.
- **Catering:** packages + WhatsApp quote form; free delivery near UM6P over 200 MAD;
  24h notice for groups over 20. (Exact package names/prices extracted at build time.)
- **About story & beliefs:** captured verbatim from source (see plan Task for copy).

## Out of scope (now)

Real backend / multi-device CMS (phase 2 after owner buys), online payment/checkout,
real Marmara photography, custom domain (optional, later).

## Risks

- Porting `DCLogic` React components to Astro components + small JS islands is the
  real work; do not copy the Babel runtime.
- `localStorage` dashboard is a demo, not a live CMS — must be stated in the README so
  it is not oversold to the owner.
```
