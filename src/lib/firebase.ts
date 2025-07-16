
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration, hardcoded for reliability.
export const firebaseConfig = {
  apiKey: "AIzaSyC9mZlFclntOb_vF4msMjZcduSOETlRY6I",
  authDomain: "pasargo-central.firebaseapp.com",
  projectId: "pasargo-central",
  storageBucket: "pasargo-central.firebasestorage.app",
  messagingSenderId: "909679104927",
  appId: "1:909679104927:web:632c43341dc54c1ac6a3aa"
};

console.log(firebaseConfig);

let app: FirebaseApp;
// This is the modern equivalent of the "if (!firebase.apps.length)" pattern.
// It ensures that Firebase is initialized only once, preventing errors.
console.log('Firebase initialization logic reached');

if (!getApps().length) {
    console.log('Initializing Firebase with config:', firebaseConfig);
app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
