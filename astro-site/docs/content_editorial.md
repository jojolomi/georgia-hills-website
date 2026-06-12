# Editorial Content Model (Firestore-backed)

## Source collections
- `cms_pages`
- `destinations`
- `articles`

## Sync flow
1. Export Firestore content snapshot into build data:
```bash
cd astro-site
npm run content:sync
```
2. Snapshot is written to:
- `src/data/cms-export.json`

## Runtime behavior
- Generated secondary pages (`src/pages/[slug].astro`) automatically read published entries from `cms-export.json`.
- GCC market pages (`src/pages/ae|sa|qa|kw|eg/index.astro`) also read published entries from `cms-export.json`.
- Fallback is safe: if no published CMS record exists, static config content is used.
- Required fields for override:
  - `slug`
  - `status: "published"`
  - localized `title`, `description`, `body`

## Suggested market slugs in `cms_pages`
- `ae`, `sa`, `qa`, `kw`, `eg`
- or `market-ae`, `market-sa`, `market-qa`, `market-kw`, `market-eg`

## Suggested core conversion slugs in `cms_pages`
- `home` (EN home hero copy)
- `home-ar` (AR home hero copy)
- `booking` (EN booking hero + booking section heading)
- `booking-ar` (AR booking hero + booking section heading)

### Mapping for core slugs
- `title` -> hero title
- `description` -> hero subtitle
- `body` line 1 -> booking section heading (for booking pages)
- `body` line 2 -> booking response-time line (for booking pages)

## Required environment variables
- `FIREBASE_SERVICE_ACCOUNT_PATH` (path to service account JSON)
- optional: `FIREBASE_PROJECT_ID`

## Notes
- Keep editors in Firestore; build consumes exported JSON snapshot.
- This keeps production builds deterministic and reviewable.
- Future step: wire dynamic content components directly to `cms-export.json` pages.
