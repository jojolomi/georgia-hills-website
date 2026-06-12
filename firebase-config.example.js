// Copy this file to firebase-config.js if you want to override the default config.
// Load it before script.js on pages that use Firebase.

window.__GH_FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  functionsRegion: "europe-west1",
  bookingEndpoint: "https://europe-west1-YOUR_PROJECT_ID.cloudfunctions.net/createBookingLead",
  adminApiEndpoint: "https://europe-west1-YOUR_PROJECT_ID.cloudfunctions.net/adminApi"
};
