import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  getAuth,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * FIREBASE CONFIGURATION
 * DO NOT COMMIT utils/firebase.ts TO GITHUB!
 * 
 * Create your own utils/firebase.ts with your Firebase credentials:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project or select existing one
 * 3. Get your Web SDK configuration
 * 4. Replace the firebaseConfig below with your credentials
 * 
 * Your utils/firebase.ts should look like this:
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Prevent re-initializing on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize auth with proper persistence for native + web
let auth: Auth;
if (Platform.OS === 'web') {
  // Web: use standard getAuth
  auth = getAuth(app);
} else {
  // Native (React Native/Expo): use initializeAuth with AsyncStorage persistence
  try {
    const getReactNativePersistence = require('@react-native-firebase/app').getReactNativePersistence || require('firebase/auth').getReactNativePersistence;
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // Fallback: if getReactNativePersistence is not available, use standard getAuth
    console.warn('Using memory persistence for Auth (AsyncStorage not configured)');
    auth = getAuth(app);
  }
}

export { auth };

export async function signUp(email: string, password: string, displayName: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  return result.user;
}

export async function signIn(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function logOut() {
  try {
    // Sign out from Firebase
    await signOut(auth);
    // Also clear AsyncStorage to ensure session is completely cleared
    if (Platform.OS !== 'web') {
      // Clear all AsyncStorage items that might contain auth data
      const keys = await AsyncStorage.getAllKeys();
      const firebaseKeys = keys.filter(key => key.includes('firebase'));
      if (firebaseKeys.length > 0) {
        await AsyncStorage.multiRemove(firebaseKeys);
      }
    }
    console.log('✅ User logged out and session cleared');
  } catch (error) {
    console.error('❌ Logout error:', error);
    throw error;
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
