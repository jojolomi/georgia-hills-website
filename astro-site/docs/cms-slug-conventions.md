# CMS Slug Conventions

Marketing copy in Firestore export must map to these stable slugs:

- Core pages:
  - `home`
  - `home-ar`
  - `booking`
  - `booking-ar`
- Market pages:
  - `ae`, `sa`, `qa`, `kw`, `eg`
  - fallback aliases supported: `market-ae`, `market-sa`, `market-qa`, `market-kw`, `market-eg`
- Secondary pages:
  - use exact route slug from `src/config/secondary-pages.ts`

Notes:
- Slugs are lowercase and hyphenated.
- Arabic pages must end with `-ar` where paired route exists.
- Layout structure stays code-owned; CMS only overrides approved marketing copy fields.
