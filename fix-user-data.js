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

async function fixUserData() {
  console.log('Starting user data fix...');
  
  try {
    // Get all scan data
    const scansSnapshot = await db.collection('analysis_cache').get();
    console.log(`Found ${scansSnapshot.docs.length} total scans`);
    
    // Group scans by email (if available) to identify orphaned data
    const scansByEmail = new Map();
    
    for (const scanDoc of scansSnapshot.docs) {
      const scanData = scanDoc.data();
      const email = scanData.userEmail || scanData.email;
      
      if (email) {
        if (!scansByEmail.has(email)) {
          scansByEmail.set(email, []);
        }
        scansByEmail.get(email).push({
          docId: scanDoc.id,
          userId: scanData.userId,
          email: email,
          timestamp: scanData.timestamp
        });
      }
    }
    
    console.log(`Found scans for ${scansByEmail.size} unique emails`);
    
    // For each email, check if there are multiple user IDs
    for (const [email, scans] of scansByEmail.entries()) {
      const userIds = [...new Set(scans.map(s => s.userId))];
      
      if (userIds.length > 1) {
        console.log(`\nEmail ${email} has scans with multiple user IDs:`, userIds);
        
        // Find the most recent user document for this email
        const usersSnapshot = await db.collection('users')
          .where('email', '==', email)
          .orderBy('lastSignIn', 'desc')
          .limit(1)
          .get();
        
        if (!usersSnapshot.empty) {
          const latestUser = usersSnapshot.docs[0];
          const correctUserId = latestUser.id;
          
          console.log(`  Using most recent user ID: ${correctUserId}`);
          
          // Update all scans for this email to use the correct user ID
          const batch = db.batch();
          for (const scan of scans) {
            if (scan.userId !== correctUserId) {
              const scanRef = db.collection('analysis_cache').doc(scan.docId);
              batch.update(scanRef, { userId: correctUserId });
              console.log(`    Updating scan ${scan.docId} from ${scan.userId} to ${correctUserId}`);
            }
          }
          
          await batch.commit();
          console.log(`  Successfully updated ${scans.length} scans for ${email}`);
        } else {
          console.log(`  No user document found for email: ${email}`);
        }
      }
    }
    
    console.log('\nUser data fix completed!');
  } catch (error) {
    console.error('Fix failed:', error);
  }
}

fixUserData().catch(console.error); 