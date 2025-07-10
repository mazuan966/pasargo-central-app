
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

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
    console.log('[DIAGNOSTIC] firebase.ts: Attempting to initialize Firebase...');
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
        console.log('[DIAGNOSTIC] firebase.ts: Firebase initialized successfully.');
    } else {
        app = getApp();
        console.log('[DIAGNOSTIC] firebase.ts: Firebase app already exists, getting app.');
    }

    auth = getAuth(app);
    db = getFirestore(app);
    console.log('[DIAGNOSTIC] firebase.ts: Auth and DB services retrieved. DB object is:', db ? 'Defined' : 'Undefined');

} catch (error) {
    console.error('[DIAGNOSTIC] firebase.ts: Critical error during Firebase initialization.', error);
}


export { app, auth, db };
