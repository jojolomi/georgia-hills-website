# Contentful CMS (Optional)

Default CMS source remains Firestore export (`src/data/cms-export.json`).

To switch to Contentful export:
1. Provide `PUBLIC_CMS_PROVIDER=contentful`.
2. Generate or place export JSON at `astro-site/src/data/contentful-export.json`.
3. Or run:
   - `npm --prefix astro-site run content:sync:contentful`
   - with `CONTENTFUL_EXPORT_PATH` pointing to a valid JSON export.

Current integration scope is marketing copy fields only (title/description/body by locale).
