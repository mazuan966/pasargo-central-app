
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration, hardcoded for reliability.
const firebaseConfig = {
  apiKey: "AIzaSyC9mZlFclntOb_vF4msMjZcduSOETlRY6I",
  authDomain: "pasargo-central.firebaseapp.com",
  projectId: "pasargo-central",
  storageBucket: "pasargo-central.appspot.com",
  messagingSenderId: "909679104927",
  appId: "1:909679104927:web:632c43341dc54c1ac6a3aa"
};

// This function ensures we initialize the app only once.
function getFirebaseApp(): FirebaseApp {
    if (!getApps().length) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

export const app: FirebaseApp = getFirebaseApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
