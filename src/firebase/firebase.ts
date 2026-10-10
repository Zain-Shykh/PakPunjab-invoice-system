import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  enableIndexedDbPersistence,
  writeBatch,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBNXmNpi3QiAfxprZLXXfPiKTGgDuYrswI",
  authDomain: "pakpunjab-983fc.firebaseapp.com",
  projectId: "pakpunjab-983fc",
  storageBucket: "pakpunjab-983fc.firebasestorage.app",
  messagingSenderId: "1093351401778",
  appId: "1:1093351401778:web:2d02b054e9e6bc4eec0f2b"
};

// Initialize or retrieve Firebase App singleton
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore
export const firestore = getFirestore(firebaseApp);

// Try to enable offline persistence if supported in browser
if (typeof window !== 'undefined') {
  try {
    enableIndexedDbPersistence(firestore).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firebase persistence failed-precondition (multiple tabs active):', err.message);
      } else if (err.code === 'unimplemented') {
        console.warn('Firebase persistence unimplemented in browser:', err.message);
      }
    });
  } catch (e) {
    // Persistence already configured or unavailable
  }
}
