# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The **active Marmara restaurant website** is an Astro static site under `src/`. Run it with npm (see commands below). It builds to `dist/` and deploys to Netlify or Cloudflare Pages.

`Marmara Restaurant Website.html` in the root is the original single-file bundle. It is the **design source and content reference**: the markup under `src/raw/` was captured from it. It is not the active site — do not hand-edit it for ongoing work.

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server at http://localhost:4321
npm run build      # production build → dist/
npm run preview    # serve dist/ locally
npm test           # Vitest unit tests
```

**Testing interactivity:** the islands load bundled JS via absolute `/_astro/` paths, which do not resolve under `file://`. Always exercise cart/tabs/forms/dashboard over HTTP (`npm run dev` or `npm run preview`), never by opening `dist/*.html` directly.

## Architecture

Astro v4, static output, no UI framework. The key idea: **each page renders the original design's exact captured markup**, wrapped in a shared layout, with behavior added by small vanilla-JS islands.

### Pages (`src/pages/`)

Each `*.astro` imports its captured body as a raw string and renders it inside `BaseLayout`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import body from '../raw/home.html?raw';
---
<BaseLayout title="…" description="…">
  <Fragment set:html={body} />
  <script>import '../scripts/menu-cart.js';</script>
</BaseLayout>
```

Routes: `index`→`/`, `menu`, `catering`, `about`, `visit`, `dashboard`.

### Captured markup (`src/raw/`)

- `home/menu/catering/about/visit/admin.html` — the exact rendered HTML (inline styles) of each original page, cleaned of bundler scaffolding; internal `*.dc.html` links remapped to routes (`/menu`, `/dashboard`, …).
- `dashboard-full.html` — the owner panel assembled so all 8 sidebar sections are present and switchable (the original rendered them on demand, so each was captured separately).
- `dash/*.html` — the 8 captured dashboard sections (source for `dashboard-full.html`).

Do not reformat these files by hand. To change the design, re-capture from the original (headless render → extract body) rather than editing the generated markup.

### Layout & styles

- `src/layouts/BaseLayout.astro` — `<head>`: SEO/OG meta, favicon, **Google Fonts (Hanken Grotesk + Bricolage Grotesque)**, and `src/styles/anim.css`. Renders a single `<slot/>` (the captured markup already includes its own nav/footer).
- `src/styles/anim.css` — keyframes referenced by the markup (`mar-pulse`, `mar-marquee`, `mar-float`, `sc-shine`).

### Scripts (`src/scripts/`) — vanilla JS islands

- `whatsapp.js` — `buildOrderUrl(cart, {phone})` and `buildContactUrl(phone, msg)`, pure functions (has `whatsapp.test.js`).
- `menu-cart.js` — imported by `index.astro` + `menu.astro`. Wires the `+` controls (each card has an `image-slot id="mphoto-<itemId>"` mapped to `menu.json`) into a fixed cart bar, and the category tabs into card/section filtering.
- `catering-quote.js` — imported by `catering.astro`. Intercepts the “Send my request on WhatsApp” link, builds a message from the form fields, opens `wa.me`.
- `dash.js` — imported by `dashboard.astro`. Sidebar section switching (matches nav rows by label), active-state styling, and generic `localStorage` persistence for all dashboard fields.

These target the captured DOM by stable hooks (e.g. `image-slot` ids, inline-style signatures). If you re-capture markup, re-verify these selectors.

### Data (`src/data/`)

- `site.json` — contact details, hours, hero copy. **Placeholders**: WhatsApp `212600000000`, Instagram `marmara.fruits`, address. Note: the captured markup ALSO contains these values inline (`wa.me/...`, `tel:`), so go-live edits must touch both `site.json` and `src/raw/`.
- `menu.json` — 34 items across 9 categories; drives the cart’s name/price lookups (has `menu.test.js`).

## Dashboard note

`/dashboard` reproduces the original panel exactly and is interactive (all 8 sections switch; fields persist), but persistence is `localStorage` on the editing device only — edits do not reach customers or rewrite the static public pages. A real backend (e.g. Supabase) is phase 2.

## Verifying design fidelity

Page parity with the original was checked by rendering both headlessly (Playwright/Chromium) and comparing screenshots + pixel heights. `playwright-core` is intentionally **not** a project dependency; install it ad-hoc if you need to re-verify.

## Reference: original bundle architecture

`Marmara Restaurant Website.html` is a self-contained ~2 MB file (open in a browser, no build). Its pages are React apps (Babel standalone, `text/babel`) embedded as escaped JSON strings inside `__bundler/template` blocks within a `PAGES` object; navigation is hash-based via an `<iframe>` `srcdoc` swap; assets are base64 in per-page `__bundler/manifest` blocks. The `src/raw/` markup is the post-render output of these pages.
