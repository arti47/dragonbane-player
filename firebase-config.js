/*
 * firebase-config.js — Firebase project configuration
 * ---------------------------------------------------
 * The app runs in LOCAL/OFFLINE mode out of the box (no sync, data saved
 * on-device via localStorage). To enable real-time cloud sync and the
 * shared party features, paste your own Firebase web-app config below and
 * set `FIREBASE_ENABLED = true`.
 *
 * How to get these values:
 *   1. Create a project at https://console.firebase.google.com
 *   2. Add a Web App (</>) to the project.
 *   3. Enable Anonymous auth (and optionally Google) under Authentication.
 *   4. Create a Realtime Database (or Firestore) and Storage.
 *   5. Copy the `firebaseConfig` values into FIREBASE_CONFIG below.
 *   6. Set FIREBASE_ENABLED = true.
 *
 * See README.md for full step-by-step setup and security rules.
 * NOTE: these keys are NOT secret (they ship in client code) — but DO keep
 * your database security rules locked down. Never commit a service-account key.
 */

const FIREBASE_ENABLED = false; // flip to true once FIREBASE_CONFIG is filled in

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

if (typeof window !== "undefined") {
  window.FIREBASE_ENABLED = FIREBASE_ENABLED;
  window.FIREBASE_CONFIG = FIREBASE_CONFIG;
}
