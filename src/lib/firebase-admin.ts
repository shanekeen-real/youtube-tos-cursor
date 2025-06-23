import admin from 'firebase-admin';

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

export const adminDb = admin.firestore(); 