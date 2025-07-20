// Only import Firebase Admin SDK on the server side
import type { Firestore } from 'firebase-admin/firestore';

let admin: typeof import('firebase-admin') | null = null;
let adminDb: any = null; // Keep as any for backward compatibility

if (typeof window === 'undefined') {
  // Server-side only
  try {
    const firebaseAdmin = require('firebase-admin');
    admin = firebaseAdmin;
    
    // --- Robust Singleton Initialization for Firebase Admin ---
    if (admin && !admin.apps.length) {
      try {
        const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
        if (!serviceAccountBase64) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 env variable is not set.');
        }
        const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin SDK initialized successfully.");
      } catch (error: unknown) {
        console.error("Firebase Admin SDK initialization error:", error instanceof Error ? error.message : String(error));
        // Avoid throwing error in dev, let it be handled by subsequent calls
        if (process.env.NODE_ENV !== 'development') {
            throw error;
        }
      }
    }

    if (admin) {
      adminDb = admin.firestore() as Firestore;
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

export { adminDb }; 