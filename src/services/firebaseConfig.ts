import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'ai-agent-25f66',
  appId: '1:255514847512:web:8de3831eba67ba691b566d',
  storageBucket: 'ai-agent-25f66.firebasestorage.app',
  apiKey: 'AIzaSyDmMS99r6FKiX_uGDQhvvfoJHc52SPhoXI',
  authDomain: 'ai-agent-25f66.firebaseapp.com',
  messagingSenderId: '255514847512',
  measurementId: 'G-SHM69WHN7V',
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
