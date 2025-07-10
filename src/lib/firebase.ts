
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

// This is the standard and robust way to initialize Firebase in a Next.js app.
const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
