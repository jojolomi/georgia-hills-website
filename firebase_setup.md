# Firebase Setup for Georgia Hills

This site supports:
- Firestore destination content updates from `admin.html`
- Admin login via Firebase Auth
- Optional booking lead endpoint via Cloud Functions

## 1) Configure project
1. Create/select Firebase project.
2. Enable Firestore.
3. Enable Authentication (`Email/Password`).

## 2) Frontend config
The project has a default web config in `script.js`.

If you need to override:
1. Copy `firebase-config.example.js` to `firebase-config.js`.
2. Fill your values.
3. Load `firebase-config.js` before `script.js` on pages that use Firebase.

## 3) Security rules
Deploy `firestore.rules` and `firestore.indexes.json`:

```bash
firebase deploy --only firestore
```

## 4) Functions (optional)
Functions source is under `functions/`.

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## 5) Local validation

```bash
npm install
npm run check
```
