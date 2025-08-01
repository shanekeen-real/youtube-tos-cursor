import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/queue/migrate-completed-scans",
    },
    async () => {
      let session = null;
      try {
        session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all completed, cancelled, and failed scans for this user that are not yet archived
        let scansToMigrate;
        try {
          const completedScans = await adminDb.collection('scan_queue')
            .where('userId', '==', userId)
            .where('status', '==', 'completed')
            .get();
            
          const cancelledScans = await adminDb.collection('scan_queue')
            .where('userId', '==', userId)
            .where('status', '==', 'cancelled')
            .get();
            
          const failedScans = await adminDb.collection('scan_queue')
            .where('userId', '==', userId)
            .where('status', '==', 'failed')
            .get();
            
          // Combine all scans that should be archived
          const allScans = [...completedScans.docs, ...cancelledScans.docs, ...failedScans.docs];
          
          // Filter out scans that are already archived
          scansToMigrate = allScans.filter((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            return data.archivedFromQueue !== true;
          });
        } catch (firebaseError: any) {
          // Handle Firebase quota exceeded errors gracefully
          if (firebaseError.code === 8 || firebaseError.message?.includes('RESOURCE_EXHAUSTED')) {
            console.warn('Firebase quota exceeded for migrate-completed-scans, returning success with 0 migrated');
            return NextResponse.json({
              success: true,
              migratedCount: 0,
              message: 'Firebase quota exceeded - no scans migrated'
            });
          }
          throw firebaseError; // Re-throw other errors
        }

        if (scansToMigrate.length === 0) {
          return NextResponse.json({ 
            success: true, 
            migratedCount: 0,
            message: 'No completed scans found to migrate' 
          });
        }

        // Update all matching scans to mark them as archived
        const batch = adminDb.batch();
        let migratedCount = 0;

        scansToMigrate.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          batch.update(doc.ref, {
            archivedFromQueue: true,
            archivedAt: Timestamp.now()
          });
          migratedCount++;
        });

        await batch.commit();

        console.log(`Migrated ${migratedCount} completed scans for user ${userId}`);

        return NextResponse.json({
          success: true,
          migratedCount,
          message: `Successfully migrated ${migratedCount} completed scans from "In Queue" tab`
        });

      } catch (error: unknown) {
        console.error('Error migrating completed scans:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'migrate-completed-scans' },
          extra: { userId: session?.user?.id }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({
          error: 'Failed to migrate completed scans',
          details: errorMessage
        }, { status: 500 });
      }
    }
  );
} 