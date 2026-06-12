import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getToken, initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const fallback = {
  apiKey: "AIzaSyApLm0zacQiM1VbSQ5INRlQ28ev3QoTw2o",
  authDomain: "georgiahills-15d19.firebaseapp.com",
  projectId: "georgiahills-15d19",
  storageBucket: "georgiahills-15d19.firebasestorage.app",
  messagingSenderId: "447700508040",
  appId: "1:447700508040:web:379c32079d09523a14ae3d",
  functionsRegion: "europe-west1",
  adminApiEndpoint: "https://europe-west1-georgiahills-15d19.cloudfunctions.net/adminApi"
};

export const firebaseConfig = window.__GH_FIREBASE_CONFIG || window.firebaseConfig || fallback;
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

let appCheck = null;
if (firebaseConfig.appCheckSiteKey) {
  try {
    appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(firebaseConfig.appCheckSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (_) {
    appCheck = null;
  }
}

export async function getAppCheckTokenOrEmpty() {
  if (!appCheck) return "";
  try {
    const tokenResult = await getToken(appCheck, false);
    return tokenResult?.token || "";
  } catch (_) {
    return "";
  }
}
