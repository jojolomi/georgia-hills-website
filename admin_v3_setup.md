# Admin v3 Setup (Single Owner)

## 1) Install

```bash
npm install
npm --prefix admin-v3 install
```

## 2) Required backend env

Set in Cloud Functions environment:

- `ADMIN_OWNER_UID` : the only UID allowed to mutate admin data
- `ADMIN_REQUIRE_ORIGIN` : `true` (recommended) to require browser origin on admin API
- `ADMIN_ALLOWED_ORIGINS` : comma-separated allowed origins for admin API (e.g. production + staging + localhost)
- `ADMIN_REQUIRE_APP_CHECK` : optional `true` to enforce App Check token on admin API
- Optional integration status vars:
  - `GOOGLE_ADS_ID`
  - `HOTJAR_ID`
  - `TIDIO_KEY`
  - `NEWSLETTER_ENDPOINT`
  - `STRIPE_PAYMENT_LINK`
  - `BOOKING_CALENDAR_LINK`

## 2.1 Provision single owner admin claim

```bash
npm --prefix functions run owner:provision -- menaashraf931931@gmail.com
```

This assigns Firebase custom claims (`admin: true`, `role: "admin"`) and prints the UID to use as `ADMIN_OWNER_UID`.

## 3) Run admin v3 locally

```bash
npm run dev:admin-v3
```

If `ADMIN_REQUIRE_APP_CHECK=true`, provide `appCheckSiteKey` in your `firebase-config.js` for admin-v3.

## 4) Build

```bash
npm run build:admin-v3
```

Prepare production hosting artifacts:

```bash
npm run build:admin-v3:hosting
```

## 5) API compatibility

- Admin v3 uses `adminApi` actions only.
- Existing `admin-v2` remains compatible during cutover.

## 6) Cutover

- Keep `/admin-v2` live while validating v3.
- Once parity is accepted, route `/admin` to `/admin-v3/`.
- Production hosting serves the SPA from `admin-v3/index.prod.html`.

## 7) Admin v3 reliability tests

Run static smoke:

```bash
npm run test:admin-v3
```

Run authenticated smoke (optional):

```bash
ADMIN_V3_E2E_EMAIL=owner@example.com ADMIN_V3_E2E_PASSWORD=your-password npm run test:admin-v3:auth
```
