# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The **active Marmara restaurant website** is an Astro static site under `src/`. Run it with npm (see commands below). It builds to `dist/` and deploys to Netlify or Cloudflare Pages.

`Marmara Restaurant Website.html` in the root is an older single-file bundle kept as a **design and content reference only**. It is not the active site — do not treat it as the source of truth for ongoing work.

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server at http://localhost:4321
npm run build      # production build → dist/
npm run preview    # serve dist/ locally
npm test           # Vitest unit tests (10 tests)
```

## Architecture

The site is an Astro v4 project with static output (no server, no JS framework).

### Pages (`src/pages/`)

| File | Route | Description |
|---|---|---|
| `index.astro` | `/` | Home — hero, stats, featured items |
| `menu.astro` | `/menu` | Full menu with category filter and cart |
| `catering.astro` | `/catering` | Catering packages, quote form |
| `about.astro` | `/about` | Story, beliefs |
| `visit.astro` | `/visit` | Hours, address, map link |
| `dashboard.astro` | `/dashboard` | Owner dashboard (localStorage-only CMS) |

### Data (`src/data/`)

- `site.json` — contact details, hours, hero copy. **Contains placeholder values** (WhatsApp `212600000000`, phone, Instagram `marmara.fruits`, address). Swap these before go-live.
- `menu.json` — 34 menu items across 9 categories.
- `catering.json` — catering packages and pricing.

All data files are loaded at build time by Astro pages — no runtime API calls.

### Components (`src/components/`)

Reusable Astro components: `Nav.astro`, `Footer.astro`, `MenuCard.astro`, `CartDrawer.astro`, `SectionHeader.astro`, `StatRow.astro`, `QrBlock.astro`.

### Layouts (`src/layouts/`)

`BaseLayout.astro` — shared `<head>`, SEO meta, nav and footer shell.

### Scripts (`src/scripts/`)

Client-side JS modules (not framework components):

- `whatsapp.js` — `buildOrderUrl(cart, {phone})` and `buildContactUrl(phone, msg)` — pure functions, no side-effects.
- `cart.js` — `addItem`, `removeItem`, `getCart`, `clearCart` — localStorage cart state.
- `cms.js` — `loadContent`, `saveContent`, `mergeContent`, `STORAGE_KEY` — localStorage owner dashboard helpers.
- `*-island.js` — client-side interactivity wired up per page.

Each module has a paired `*.test.js` unit test.

## Dashboard note

The owner dashboard at `/dashboard` persists edits to `localStorage` only. Changes are visible on the editing device but do not update the built site for other visitors. A real CMS backend (e.g. Supabase) is phase 2.

## Images

`public/images/` contains gradient placeholders. See `public/images/CREDITS.md` for slot names and recommended sizes before adding real photos.

## Reference: original bundle architecture

The original `Marmara Restaurant Website.html` is a self-contained ~2 MB file. No build system — open in a browser. Its pages are React apps (Babel standalone, `text/babel`) embedded as escaped JSON strings inside `__bundler/template` script blocks inside a `PAGES` object. Navigation is hash-based, routing via `<iframe id="frame">` + `srcdoc` swap. Assets (fonts, images) are base64-encoded in a per-page `__bundler/manifest`. Do not hand-edit it; treat it as build output from a design-canvas tool.
