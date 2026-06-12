# Top-Tier Setup

## 0. Release discipline (staging -> production)
- Update `.firebaserc` with real Firebase project IDs for:
  - `staging`
  - `production`
- Add GitHub variable:
  - `FIREBASE_PROJECT_ID_STAGING`
- Add GitHub secrets:
  - `FIREBASE_SERVICE_ACCOUNT_STAGING` (service account JSON)
  - `FIREBASE_TOKEN_PRODUCTION` (`firebase login:ci`)
- Enforce protections:
  - `main` requires pull request + passing CI
  - `production` environment requires reviewer approval
- Runbook:
  - See `RELEASE_RUNBOOK.md`

## 1. Deploy backend changes
- Deploy Firestore rules and functions:
```bash
firebase deploy --only firestore:rules,functions
```

## 2. Set custom roles (RBAC)
- Use `adminApi` action `setUserRole` (admin-only) to assign:
  - `admin`
  - `editor`
  - `viewer`

Payload shape:
```json
{
  "action": "setUserRole",
  "payload": {
    "uid": "FIREBASE_UID",
    "role": "admin"
  }
}
```

## 3. Configure optional lead notifications
- Set these function env vars if needed:
  - `CRM_WEBHOOK_URL`
  - `RESEND_API_KEY`
  - `ADMIN_ALERT_EMAIL`
  - `ALERT_FROM_EMAIL`
  - `SCHEDULER_SECRET` (required for scheduled publish runner)

## 4. CMS workflow in admin panel
- Save in page editor = **Draft** (`cms_pages`).
- Click **Publish** = pushes to public `settings/page_*`.
- Use **Rollback** + revision picker to restore old content.

## 5. SEO automation
- Run:
```bash
npm run seo:engine
```
- Output:
  - Updates sitemap `lastmod`
  - Writes report to `scripts/seo-report.json`
  - Includes canonical/hreflang validation + internal link map suggestions.

## 6. Scheduled publishing automation
- Create Cloud Scheduler job calling:
  - `https://europe-west1-YOUR_PROJECT_ID.cloudfunctions.net/runScheduledPublishes`
- Method: `POST`
- Header: `x-scheduler-secret: <SCHEDULER_SECRET>`
- Frequency example: every 5 minutes.
