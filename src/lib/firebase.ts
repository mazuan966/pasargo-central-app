import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC9mZlFclntOb_vF4msMjZcduSOETlRY6I",
  authDomain: "pasargo-central.firebaseapp.com",
  projectId: "pasargo-central",
  storageBucket: "pasargo-central.firebasestorage.app",
  messagingSenderId: "909679104927",
  appId: "1:909679104927:web:632c43341dc54c1ac6a3aa"
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

// Only initialize Firebase if all required config values are present.
// This prevents errors when the config is incomplete.
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // This warning will be shown in the server console during development
  // if the Firebase credentials are not provided.
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      'Firebase config is missing or incomplete. Firebase services will be disabled.'
    );
  }
}

export { app, auth, db };
