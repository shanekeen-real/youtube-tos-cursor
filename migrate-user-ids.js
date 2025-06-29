const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables (same as in firebase-admin.ts)
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  })
});

const db = admin.firestore();

async function migrateUserIds() {
  console.log('Starting user ID migration...');
  
  try {
    // Get all users from the users collection
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.docs.length} users to process`);
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const currentUserId = userDoc.id;
      
      console.log(`Processing user: ${userData.email} (current ID: ${currentUserId})`);
      
      // Check if this user has a googleAccountId stored
      if (userData.googleAccountId && userData.googleAccountId !== currentUserId) {
        console.log(`  User has googleAccountId: ${userData.googleAccountId}`);
        
        // Get all scan data for this user
        const scansSnapshot = await db.collection('analysis_cache')
          .where('userId', '==', currentUserId)
          .get();
        
        console.log(`  Found ${scansSnapshot.docs.length} scans to migrate`);
        
        // Update all scan documents to use the Google account ID
        const batch = db.batch();
        for (const scanDoc of scansSnapshot.docs) {
          batch.update(scanDoc.ref, { userId: userData.googleAccountId });
        }
        
        // Also update the user document to use the Google account ID
        const newUserRef = db.collection('users').doc(userData.googleAccountId);
        batch.set(newUserRef, userData, { merge: true });
        
        // Delete the old user document
        batch.delete(userDoc.ref);
        
        await batch.commit();
        console.log(`  Successfully migrated user data to new ID: ${userData.googleAccountId}`);
      } else {
        console.log(`  User already has consistent ID or no googleAccountId found`);
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateUserIds().catch(console.error); 