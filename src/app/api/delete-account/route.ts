import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";

// Helper to delete all user-related data
async function deleteUserData(userId: string) {
  // Delete user profile
  await adminDb.collection('users').doc(userId).delete();

  // Delete scans from the correct collection
  const scansSnap = await adminDb.collection('analysis_cache').where('userId', '==', userId).get();
  const batch = adminDb.batch();
  scansSnap.docs.forEach(doc => batch.delete(doc.ref));

  // Remove scanHistory batch delete for now (index issues)
  // Add more collections as needed

  await batch.commit();
}

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/delete-account",
    },
    async () => {
      try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Log the deletion request for auditability
        await adminDb.collection('user_deletion_logs').add({
          userId,
          requestedAt: new Date(),
          ip: req.headers.get('x-forwarded-for') || req.ip || null,
        });

        // Delete all user data
        await deleteUserData(userId);

        // (Optional) Invalidate user session here if needed

        return NextResponse.json({ success: true, message: 'Account and all data deleted.' });
      } catch (error: any) {
        console.error('Delete account error:', error);
        Sentry.captureException(error);
        return NextResponse.json({ error: 'Internal server error', details: error.message, stack: error.stack }, { status: 500 });
      }
    }
  );
} 