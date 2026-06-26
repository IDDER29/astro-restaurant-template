# Marmara — Ben Guerir

Marmara is a late-night restaurant in Ben Guerir, Morocco, two minutes from the UM6P campus. It serves tacos, burgers, sandwiches, pizza, breakfast and cold-pressed juice — open every day until 1 AM.

This repository is the **Astro static-site rebuild** of the Marmara web presence. It reproduces the original single-file design (`Marmara Restaurant Website.html`) exactly, in a clean multi-page Astro project that is easy to deploy and maintain.

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | [Astro](https://astro.build) v4 (static output, no JS framework) |
| Markup | The original design's exact rendered markup (inline styles), captured per page |
| Fonts | Hanken Grotesk (body) + Bricolage Grotesque (headings), via Google Fonts |
| Interactivity | Small vanilla-JS islands (no framework) |
| Unit tests | [Vitest](https://vitest.dev) v2 |
| Deploy | Netlify or Cloudflare Pages (static, no server) |

---

## Running locally

```bash
npm install       # install dependencies
npm run dev       # dev server at http://localhost:4321
npm run build     # production build → dist/
npm run preview   # preview the dist/ build locally
npm test          # run unit tests
```

> Interactivity (cart, tabs, forms, dashboard) loads bundled JS via absolute
> `/_astro/` paths, so test it over HTTP (`npm run dev` / `npm run preview`),
> **not** by opening `dist/*.html` from `file://`.

---

## Project structure

```
src/
  pages/          # One .astro file per route — each renders its captured markup
    index.astro       → /          (home)
    menu.astro        → /menu
    catering.astro    → /catering
    about.astro       → /about
    visit.astro       → /visit
    dashboard.astro   → /dashboard (owner panel)
  layouts/
    BaseLayout.astro  # shared <head>: SEO/OG, Google Fonts, favicon, animations
  raw/            # exact rendered markup captured from the original design
    home.html  menu.html  catering.html  about.html  visit.html  admin.html
    dashboard-full.html   # assembled owner panel (all 8 sidebar sections)
    dash/                 # the 8 captured dashboard sections (source for the above)
  scripts/        # vanilla-JS interactivity islands
    whatsapp.js       — wa.me URL builders (buildOrderUrl, buildContactUrl) + tests
    menu-cart.js      — “+” cart bar + category-tab filtering (home + menu)
    catering-quote.js — catering form → pre-filled WhatsApp message
    dash.js           — dashboard sidebar section switching + local field persistence
  data/
    site.json         — contact details, hours, hero copy (swap before go-live)
    menu.json         — 34 menu items across 9 categories (drives cart lookups) + test
  styles/
    anim.css          — keyframes used by the captured markup (mar-*, sc-shine)
public/
  images/CREDITS.md   — photos are CSS-gradient placeholders in the markup; see this file
  favicon.svg  og-image.svg
Marmara Restaurant Website.html  — original bundle: design + content reference (see below)
```

### Why captured markup?

The original was a self-contained bundle whose pages were rendered by an in-browser
React runtime. To reproduce the design **exactly**, each page was rendered headlessly
and its real HTML/CSS captured into `src/raw/*.html`, then wrapped in `BaseLayout` and
re-animated with the JS islands. Page-by-page parity was verified with Playwright
screenshots against the original (matching pixel heights).

---

## How ordering works

Customers browse the menu, tap `+` to build a cart, and tap “Send order on WhatsApp” —
this opens a pre-filled WhatsApp message to the restaurant. Catering quotes work the
same way (fill the form → “Send my request on WhatsApp”). No payment gateway or backend
is needed; orders land in WhatsApp as they already do today.

---

## Demo note

The owner dashboard (`/dashboard`) reproduces the original panel exactly: all eight
sidebar sections (Dashboard, Orders, Menu, Catering, Website content, Hours, Business
info, QR codes) switch on click, and every field remembers what you type. **Edits are
persisted to `localStorage` on the editing device only** — they do not propagate to
customers or other devices, and they do not rewrite the public pages (which are static).

Phase 2 (not in scope here) would add a real backend (e.g. Supabase) so a single owner
edit updates the live site for everyone.

---

## Go-live checklist

- [ ] `src/data/site.json` → `whatsapp`: replace `212600000000` with the real number (digits + country code). This number also drives every `wa.me` / `tel:` link baked into the captured markup — search `src/raw/` and update those too.
- [ ] `instagram`: replace `marmara.fruits` with the real handle (also in `src/raw/`).
- [ ] Confirm the address `123 Avenue Hassan II, Ben Guerir 43150` and the Google Maps query in the markup point to the real location.
- [ ] Add real food photos: the cards use CSS-gradient placeholders (`image-slot` elements). See `public/images/CREDITS.md`.
- [ ] Replace `public/og-image.svg` with a 1200×630 PNG/JPG and update `ogImage` in `BaseLayout.astro` (SVG OG images aren’t reliably supported by social crawlers).
- [ ] Set up a Google Business Profile so the restaurant appears in local search/Maps.
- [ ] `npm run build`, verify in `dist/` over HTTP, then deploy.

---

## Deploying

**Netlify** — connect the repo; `netlify.toml` sets build `npm run build`, publish `dist`.
**Cloudflare Pages** — new Pages project → build `npm run build`, output `dist`.
No environment variables; the build is fully static.

---

## Reference file

`Marmara Restaurant Website.html` is the original single-file bundle. It is both the
**design source** (the `src/raw/*.html` markup was captured from it) and a content
reference. It is not the active site — make ongoing changes under `src/`.
