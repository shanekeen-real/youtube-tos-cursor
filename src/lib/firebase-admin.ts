import * as admin from 'firebase-admin';

// --- Base64 Decoded Service Account Initialization ---
const base64ServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

if (!base64ServiceAccount) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 env variable is not set.');
}

// Decode the Base64 string to a JSON object
const serviceAccount = JSON.parse(
  Buffer.from(base64ServiceAccount, 'base64').toString('utf-8')
);

// Initialize the app if it hasn't been initialized yet
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized successfully for webhook.');
  } catch (e) {
    console.error('Firebase Admin SDK Initialization Error (Webhook):', e);
    throw e;
  }
}

// Export the initialized admin SDK's firestore instance
export const adminDb = admin.firestore(); 