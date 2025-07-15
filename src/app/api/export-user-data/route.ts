import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";

// Helper to fetch all user-related data
async function getUserData(userId: string) {
  // Define all compliance-relevant fields with null defaults
  const defaultProfile = {
    email: null,
    displayName: null,
    photoURL: null,
    createdAt: null,
    lastSignIn: null,
    googleAccountId: null,
    scanLimit: null,
    scanCount: null,
    subscriptionTier: null,
    stripeCustomerId: null,
    subscriptionData: null,
    twoFactorEnabled: null,
    twoFactorSetupAt: null,
    twoFactorEnabledAt: null,
    twoFactorSecret: null,
    cpm: null,
    rpm: null,
    monetizedPercent: null,
    includeCut: null,
    revenueCalculatorSetup: null,
    youtube: null
  };

  // Fetch user profile
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userProfile = userDoc.exists ? { ...defaultProfile, ...userDoc.data() } : defaultProfile;

  // Fetch scans from the correct collection
  const scansSnap = await adminDb.collection('analysis_cache')
    .where('userId', '==', userId)
    .where('isCache', '==', false)
    .get();
  const scans = scansSnap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() }));

  // Remove scanHistory query for now (index issues)
  const scanHistory: any[] = [];

  // Add more collections as needed

  return {
    userProfile,
    scans,
    scanHistory,
  };
}

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/export-user-data",
    },
    async () => {
      try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limiting (simple: 1 export per hour, can be improved)
        // You can implement a more robust solution with Redis or Firestore
        // For now, just log the request
        await adminDb.collection('user_export_logs').add({
          userId,
          requestedAt: new Date(),
          ip: req.headers.get('x-forwarded-for') || req.ip || null,
        });

        // Fetch all user data
        const userData = await getUserData(userId);

        // Return as downloadable JSON
        return new NextResponse(JSON.stringify(userData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="yellow-dollar-user-data-${userId}.json"`,
          },
        });
      } catch (error: any) {
        console.error('Export user data error:', error);
        Sentry.captureException(error);
        return NextResponse.json({ error: 'Internal server error', details: error.message, stack: error.stack }, { status: 500 });
      }
    }
  );
} 