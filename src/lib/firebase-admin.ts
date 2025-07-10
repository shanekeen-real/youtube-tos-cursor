// Only import Firebase Admin SDK on the server side
let admin: any = null;
let adminDb: any = null;

if (typeof window === 'undefined') {
  // Server-side only
  try {
    const firebaseAdmin = require('firebase-admin');
    admin = firebaseAdmin;
    
    // --- Robust Singleton Initialization for Firebase Admin ---
    if (!admin.apps.length) {
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
      } catch (error: any) {
        console.error("Firebase Admin SDK initialization error:", error.message);
        // Avoid throwing error in dev, let it be handled by subsequent calls
        if (process.env.NODE_ENV !== 'development') {
            throw error;
        }
      }
    }

    adminDb = admin.firestore();
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

export { adminDb }; 