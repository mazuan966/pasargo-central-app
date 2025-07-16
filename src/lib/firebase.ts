
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration, hardcoded for reliability.
export const firebaseConfig = {
  apiKey: "AIzaSyB0SocaLGHuF_ge4js081vcPzeEkhfqKmk",
  authDomain: "pasargo-trial.firebaseapp.com",
  projectId: "pasargo-trial",
  storageBucket: "pasargo-trial.firebasestorage.app",
  messagingSenderId: "1004446852115",
  appId: "1:1004446852115:web:effa3486170fcde6d70be6",
  measurementId: "G-FGBRG8S7VL"
};

let app: FirebaseApp;
// This is the modern equivalent of the "if (!firebase.apps.length)" pattern.
// It ensures that Firebase is initialized only once, preventing errors.
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
