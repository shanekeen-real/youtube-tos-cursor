import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/queue/archive-completed",
    },
    async () => {
      let session = null;
      try {
        session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { scanIds } = await req.json();

        if (!scanIds || !Array.isArray(scanIds)) {
          return NextResponse.json({ error: 'Scan IDs array is required' }, { status: 400 });
        }

        if (scanIds.length === 0) {
          return NextResponse.json({ 
            success: true, 
            archivedCount: 0,
            message: 'No scans to archive' 
          });
        }

        // Get all completed scans for this user that are in the provided scanIds
        let completedScans;
        try {
          completedScans = await adminDb.collection('scan_queue')
            .where('userId', '==', userId)
            .where('status', '==', 'completed')
            .get();
        } catch (firebaseError: any) {
          // Handle Firebase quota exceeded errors gracefully
          if (firebaseError.code === 8 || firebaseError.message?.includes('RESOURCE_EXHAUSTED')) {
            console.warn('Firebase quota exceeded for archive-completed, returning success with 0 archived');
            return NextResponse.json({
              success: true,
              archivedCount: 0,
              message: 'Firebase quota exceeded - no scans archived'
            });
          }
          throw firebaseError; // Re-throw other errors
        }

        const scansToArchive = completedScans.docs.filter((doc: QueryDocumentSnapshot<DocumentData>) => 
          scanIds.includes(doc.id)
        );

        if (scansToArchive.length === 0) {
          return NextResponse.json({ 
            success: true, 
            archivedCount: 0,
            message: 'No completed scans found to archive' 
          });
        }

        // Update all matching scans to mark them as archived
        const batch = adminDb.batch();
        let archivedCount = 0;

        scansToArchive.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          batch.update(doc.ref, {
            archivedFromQueue: true,
            archivedAt: Timestamp.now()
          });
          archivedCount++;
        });

        await batch.commit();

        console.log(`Archived ${archivedCount} completed scans for user ${userId}`);

        return NextResponse.json({
          success: true,
          archivedCount,
          message: `Successfully archived ${archivedCount} completed scans from "In Queue" tab`
        });

      } catch (error: unknown) {
        console.error('Error archiving completed scans:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'archive-completed' },
          extra: { userId: session?.user?.id }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({
          error: 'Failed to archive completed scans',
          details: errorMessage
        }, { status: 500 });
      }
    }
  );
} 