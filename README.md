# Marmara — Ben Guerir

Marmara is a late-night restaurant in Ben Guerir, Morocco, two minutes from the UM6P campus. It serves tacos, burgers, sandwiches, pizza, breakfast and cold-pressed juice — open every day until 1 AM.

This repository is the **Astro static-site rebuild** of the Marmara web presence. It replaces the single-file bundle (`Marmara Restaurant Website.html`) for ongoing maintenance and deployment.

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | [Astro](https://astro.build) v4 (static output, no JS framework) |
| Styling | Plain CSS with CSS custom properties (design tokens) |
| Unit tests | [Vitest](https://vitest.dev) v2 |
| Deploy | Netlify or Cloudflare Pages (static, no server) |

---

## Running locally

```bash
npm install       # install dependencies
npm run dev       # dev server at http://localhost:4321
npm run build     # production build → dist/
npm run preview   # preview the dist/ build locally
npm test          # run unit tests (10 tests, ~300 ms)
```

---

## Project structure

```
src/
  pages/          # One .astro file per route
    index.astro       → /
    menu.astro        → /menu
    catering.astro    → /catering
    about.astro       → /about
    visit.astro       → /visit
    dashboard.astro   → /dashboard
  components/     # Reusable Astro components (Nav, Footer, MenuCard, …)
  layouts/        # BaseLayout.astro — shared <head>, SEO, nav/footer shell
  data/           # Static JSON data loaded at build time
    site.json         — contact details, hours, hero copy (swap before go-live)
    menu.json         — 34 menu items across 9 categories
    catering.json     — catering packages and pricing
  scripts/        # Client-side JS modules (cart, whatsapp, cms)
    whatsapp.js       — URL builders for WhatsApp ordering
    cart.js           — localStorage cart state
    cms.js            — localStorage owner dashboard helpers
    *-island.js       — client-side interactivity attached per page
public/
  images/         — image placeholders (see CREDITS.md before deploying)
  og-image.svg    — Open Graph image
```

---

## How ordering works

Customers browse the menu, add items to a cart, and tap "Order via WhatsApp". This opens a pre-filled WhatsApp message to the restaurant's number. No payment gateway or backend is needed — orders land in WhatsApp as they already do today.

Catering quote requests work the same way: fill the form and tap "Send via WhatsApp".

---

## Demo note

The owner dashboard (`/dashboard`) lets the restaurant owner edit menu names, descriptions and prices live in the browser. **These changes are persisted to `localStorage` on the editing device only.** They do not propagate to other devices or to visitors — the page still serves the JSON baked into the static build for everyone else.

Phase 2 (not in scope here) would replace this with a real CMS backend — for example Supabase — so that a single owner edit updates the live site for all visitors.

---

## Go-live checklist

Before publishing the site, swap every placeholder in `src/data/site.json`:

- [ ] `whatsapp`: replace `212600000000` with the real WhatsApp number (digits only, with country code)
- [ ] `phoneDisplay`: replace `+212 6 00 00 00 00` with the formatted display number
- [ ] `instagram`: replace `marmara.fruits` with the real Instagram handle
- [ ] `address`: replace `123 Avenue Hassan II, Ben Guerir 43150, Morocco` with the real street address
- [ ] `mapsQuery`: update to a query that finds the exact location on Google Maps
- [ ] `hours.open` / `hours.close`: confirm actual opening/closing times
- [ ] Add real food photos — see `public/images/CREDITS.md` for slot names and sizes; current gradients are placeholders
- [ ] Set up a Google Business Profile so the restaurant appears in local search
- [ ] Run `npm run build` after every data change and verify the output in `dist/`
- [ ] Deploy (see below)

---

## Deploying

### Netlify

Connect the repository to Netlify. It will use the settings in `netlify.toml` automatically:

- Build command: `npm run build`
- Publish directory: `dist`

### Cloudflare Pages

Create a new Pages project, point it at this repository, and set:

- Build command: `npm run build`
- Output directory: `dist`

No environment variables are required — the build is fully static.

---

## Reference file

`Marmara Restaurant Website.html` in the repository root is the original single-file bundle. It is kept as a **design and content reference only** — it is not the active site. Do not edit it; use the Astro source under `src/` for all ongoing changes.
