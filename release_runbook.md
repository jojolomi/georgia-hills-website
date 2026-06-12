# Release Runbook

## Environments
- `staging`: pull request preview channels
- `production`: live website and backend

## Required GitHub configuration
- Repository variables:
  - `FIREBASE_PROJECT_ID_STAGING`
  - `FIREBASE_PROJECT_ID_PRODUCTION`
- Repository secrets:
  - `FIREBASE_SERVICE_ACCOUNT_STAGING`
  - `FIREBASE_TOKEN_PRODUCTION`
  - `FIREBASE_SERVICE_ACCOUNT_PRODUCTION` (recommended for future parity)

## Secrets management baseline
1. Store all deploy credentials only in GitHub Environments (`staging`, `production`).
2. Never commit `.env` files or service account JSON in the repository.
3. Rotate production deploy tokens at least every 90 days.
4. Prefer short-lived OIDC/service-account auth over long-lived tokens when possible.

## Preview/Production parity
1. Run the same build and SEO validation steps for preview and production.
2. Keep identical Node major versions across CI jobs.
3. Use environment-scoped project IDs instead of hard-coded IDs in workflows.
4. Keep environment variable inventory documented in `ENVIRONMENT_INVENTORY.md`.

## Release flow
1. Open a pull request.
2. CI runs checks (`.github/workflows/ci.yml`).
3. Staging preview deploy runs (`.github/workflows/firebase-preview.yml`).
4. Verify the preview URL and approve PR.
5. Merge to `main`.
6. Production deploy runs automatically (`.github/workflows/firebase-production.yml`).

## Branch and environment protection
1. Protect `main` branch:
   - Require pull request before merge.
   - Require status checks: `CI Checks / validate`.
2. Protect `production` GitHub environment:
   - Require reviewer approval before job starts.

## Rollback
### Fast rollback (hosting only)
1. List recent releases:
```bash
firebase hosting:releases:list --project production
```
2. Clone a known good version to live:
```bash
firebase hosting:clone SITE_ID:VERSION_ID SITE_ID:live --project production
```

### Full rollback (hosting + functions + rules)
1. Find the last stable commit/tag in git.
2. Re-run the production workflow from that commit (workflow dispatch) or deploy locally:
```bash
firebase deploy --project production --only hosting,functions,firestore:rules
```
3. Verify:
   - admin panel loads
   - lead submission succeeds
   - published content renders correctly

## Smoke-check matrix and expected signals
1. Home pages:
   - `https://georgiahills.com/`
   - `https://georgiahills.com/arabic.html`
2. Conversion pages:
   - `https://georgiahills.com/booking.html`
   - `https://georgiahills.com/booking-ar.html`
3. SEO artifacts:
   - `https://georgiahills.com/sitemap.xml`
4. Expected signals:
   - HTTP 200 response
   - Canonical + hreflang present
   - JSON-LD script present
   - Footer legal links present

## Cache policy baseline
- HTML: no-store/no-cache
- Versioned static assets (`*.js`, `*.css`, images): `public,max-age=31536000,immutable`
- APIs/functions: no-cache with explicit revalidation headers
