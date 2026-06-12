# Astro Migration (Componentized Architecture)

This folder contains the new componentized frontend architecture using Astro.

## Implemented
- Shared SEO component: `src/components/SeoHead.astro`
- Central SEO config helpers: `src/config/seo.ts`
- Firestore editorial model: `src/config/cms-model.ts`
- Shared layout shell: `src/layouts/BaseLayout.astro`
- Shared header/footer: `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro`
- Reusable booking UI component: `src/components/BookingForm.astro`
- Reusable GCC market landing component + config:
  - `src/components/MarketLanding.astro`
  - `src/config/markets.ts`
- Migrated routes:
  - `/` via `src/pages/index.astro`
  - `/arabic.html` via `src/pages/arabic.astro`
  - `/booking.html` via `src/pages/booking.astro`
  - `/booking-ar.html` via `src/pages/booking-ar.astro`
  - `/ae`, `/sa`, `/qa`, `/kw`, `/eg` via `src/pages/*/index.astro`

## Run
```bash
cd astro-site
npm install
npm run dev
```

## Editorial sync
```bash
cd astro-site
npm run content:sync
```

See:
- `docs/CONTENT_EDITORIAL.md`

## Notes
- Existing static site remains untouched in repo root.
- This migration path lets you move page-by-page while sharing layout + SEO logic.
- `public/` currently reuses copied assets from the legacy site (`style.css`, `script.js`, `shared-navbar.js`, key images).
- Redirect compatibility for market URLs is included in:
  - `public/_redirects`
  - `netlify.toml`
