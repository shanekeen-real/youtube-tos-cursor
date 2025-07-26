import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/queue/cleanup-old-scans",
    },
    async () => {
      let session = null;
      try {
        session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Remove completed scans older than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const oldCompletedScans = await adminDb.collection('scan_queue')
          .where('userId', '==', userId)
          .where('status', '==', 'completed')
          .where('completedAt', '<', sevenDaysAgo)
          .get();

        let deletedCount = 0;
        const batch = adminDb.batch();

        oldCompletedScans.docs.forEach((doc) => {
          batch.delete(doc.ref);
          deletedCount++;
        });

        if (deletedCount > 0) {
          await batch.commit();
          console.log(`Cleaned up ${deletedCount} old completed scans for user ${userId}`);
        }

        return NextResponse.json({
          success: true,
          deletedCount,
          message: `Cleaned up ${deletedCount} old completed scans`
        });

      } catch (error: unknown) {
        console.error('Error cleaning up old scans:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'cleanup-old-scans' },
          extra: { userId: session?.user?.id }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
          error: 'Failed to cleanup old scans', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 