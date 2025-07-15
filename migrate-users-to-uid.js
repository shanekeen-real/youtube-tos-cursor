require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });

console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Loaded' : 'Missing or empty');

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});

const db = admin.firestore();
const auth = admin.auth();

async function migrateUsersToUid() {
  console.log('--- Starting migration of user docs to Firebase Auth UID ---');
  try {
    const usersSnapshot = await db.collection('users').get();
    let migrated = 0;
    for (const doc of usersSnapshot.docs) {
      const oldId = doc.id;
      const userData = doc.data();
      // Try to find the Firebase Auth user by email or Google account ID
      let userRecord;
      try {
        if (userData.email) {
          userRecord = await auth.getUserByEmail(userData.email);
        } else if (userData.googleAccountId) {
          userRecord = await auth.getUser(userData.googleAccountId);
        } else {
          console.warn(`No email or googleAccountId for user doc ${oldId}, skipping.`);
          continue;
        }
      } catch (e) {
        console.warn(`Could not find Firebase Auth user for doc ${oldId}:`, e.message);
        continue;
      }
      const newUid = userRecord.uid;
      if (oldId === newUid) {
        console.log(`User doc ${oldId} already uses UID, skipping.`);
        continue;
      }
      // Copy user data to new doc with UID as ID
      const newUserData = { ...userData, oldGoogleAccountId: oldId };
      await db.collection('users').doc(newUid).set(newUserData, { merge: true });
      // Update related scans
      const scansSnapshot = await db.collection('scans').where('userId', '==', oldId).get();
      for (const scanDoc of scansSnapshot.docs) {
        await scanDoc.ref.update({ userId: newUid });
      }
      // Delete old user doc
      await doc.ref.delete();
      migrated++;
      console.log(`Migrated user ${oldId} -> ${newUid} (email: ${userData.email})`);
    }
    console.log(`--- Migration complete. Migrated ${migrated} users. ---`);
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrateUsersToUid(); 