import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
}

// Initialize Firebase Client (only if API key is provided)
let app = null;
let auth = null;

try {
  if (process.env.FIREBASE_API_KEY && 
      process.env.FIREBASE_API_KEY !== 'your_firebase_api_key_here') {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log('✅ Firebase Client initialized successfully');
  } else {
    console.log('⚠️  Firebase Client not initialized - missing or placeholder API key');
  }
} catch (error) {
  console.log('⚠️  Firebase Client initialization failed:', error.message);
  console.log('   Server will continue without Firebase Client features');
}

export { auth }

// Add this import
import admin from 'firebase-admin';

// Initialize Firebase Admin (add this after initializing the client SDK)
if (!admin.apps.length) {
  try {
    // Only initialize if all Firebase credentials are provided
    if (process.env.FIREBASE_PROJECT_ID && 
        process.env.FIREBASE_CLIENT_EMAIL && 
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_PRIVATE_KEY !== 'your_private_key_here') {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      console.log('⚠️  Firebase Admin not initialized - missing or placeholder credentials');
    }
  } catch (error) {
    console.log('⚠️  Firebase Admin initialization failed:', error.message);
    console.log('   Server will continue without Firebase Admin features');
  }
}

// Export admin auth
// Export adminAuth only if Firebase Admin is initialized
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;

if (!adminAuth) {
  console.log('⚠️  Firebase Admin Auth not available - using placeholder');
}
