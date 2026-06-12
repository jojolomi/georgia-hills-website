# Environment Inventory

## Shared runtime baseline
- Node.js major: `20`
- Build command: `npm run build:astro`
- SEO checks: `npm run seo:validate`
- Optional marketing integrations:
  - `PUBLIC_HOTJAR_ID`
  - `PUBLIC_HOTJAR_SV`
  - `PUBLIC_GOOGLE_ADS_ID`
  - `PUBLIC_SEARCH_CONSOLE_VERIFICATION`
  - `PUBLIC_NEWSLETTER_ENDPOINT`
  - `PUBLIC_TIDIO_KEY`
  - `PUBLIC_STRIPE_PAYMENT_LINK`
  - `PUBLIC_BOOKING_CALENDAR_LINK`
- CMS provider selector:
  - `PUBLIC_CMS_PROVIDER` (`firestore` or `contentful`)

## Staging (`staging` GitHub environment)
- `FIREBASE_PROJECT_ID_STAGING` (variable)
- `FIREBASE_SERVICE_ACCOUNT_STAGING` (secret)

## Production (`production` GitHub environment)
- `FIREBASE_PROJECT_ID_PRODUCTION` (variable)
- `FIREBASE_TOKEN_PRODUCTION` (secret)
- `FIREBASE_SERVICE_ACCOUNT_PRODUCTION` (secret, recommended and reserved for service-account auth migration)

## Parity policy
- Staging and production must use the same Node major and build pipeline.
- `FIREBASE_PROJECT_ID_PRODUCTION` must be different from `FIREBASE_PROJECT_ID_STAGING`.
- Secrets must be scoped to the GitHub environment; no repo-level plaintext credentials.
