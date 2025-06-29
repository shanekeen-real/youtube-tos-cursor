// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

// Initialize Firebase Admin using base64-encoded service account (same as firebase-admin.ts)
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
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

async function runMigration() {
  console.log('Starting user data migration...');
  console.log('Environment check:');
  console.log('- FIREBASE_SERVICE_ACCOUNT_BASE64:', process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ? '✓ Set' : '✗ Missing');
  
  try {
    // Get all scan data
    const scansSnapshot = await db.collection('analysis_cache').get();
    console.log(`\nFound ${scansSnapshot.docs.length} total scans`);
    
    // Group scans by email to identify orphaned data
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
    
    let totalFixed = 0;
    
    // For each email, check if there are multiple user IDs
    for (const [email, scans] of scansByEmail.entries()) {
      const userIds = [...new Set(scans.map(s => s.userId))];
      
      if (userIds.length > 1) {
        console.log(`\n📧 Email ${email} has scans with multiple user IDs:`, userIds);
        
        // Find the most recent user document for this email
        const usersSnapshot = await db.collection('users')
          .where('email', '==', email)
          .orderBy('lastSignIn', 'desc')
          .limit(1)
          .get();
        
        if (!usersSnapshot.empty) {
          const latestUser = usersSnapshot.docs[0];
          const correctUserId = latestUser.id;
          
          console.log(`  ✅ Using most recent user ID: ${correctUserId}`);
          
          // Update all scans for this email to use the correct user ID
          const batch = db.batch();
          let updatedCount = 0;
          
          for (const scan of scans) {
            if (scan.userId !== correctUserId) {
              const scanRef = db.collection('analysis_cache').doc(scan.docId);
              batch.update(scanRef, { userId: correctUserId });
              updatedCount++;
            }
          }
          
          if (updatedCount > 0) {
            await batch.commit();
            console.log(`  ✅ Successfully updated ${updatedCount} scans for ${email}`);
            totalFixed += updatedCount;
          } else {
            console.log(`  ℹ️  No scans needed updating for ${email}`);
          }
        } else {
          console.log(`  ❌ No user document found for email: ${email}`);
        }
      } else {
        console.log(`  ✅ Email ${email} has consistent user ID: ${userIds[0]}`);
      }
    }
    
    console.log(`\n🎉 Migration completed! Fixed ${totalFixed} scans total.`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration().catch(console.error); 