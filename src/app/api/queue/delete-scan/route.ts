import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import * as Sentry from "@sentry/nextjs";

export async function DELETE(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "DELETE /api/queue/delete-scan",
    },
    async () => {
      let session = null;
      try {
        session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const queueId = searchParams.get('queueId');

        if (!queueId) {
          return NextResponse.json({ error: 'Queue ID is required' }, { status: 400 });
        }

        // Get the queue item and verify ownership
        const queueRef = adminDb.collection('scan_queue').doc(queueId);
        const queueDoc = await queueRef.get();

        if (!queueDoc.exists) {
          return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
        }

        const queueData = queueDoc.data();
        if (queueData?.userId !== userId) {
          return NextResponse.json({ error: 'Unauthorized access to queue item' }, { status: 403 });
        }

        // Only allow deletion of pending or failed scans
        if (queueData?.status === 'processing') {
          return NextResponse.json({ 
            error: 'Cannot delete a scan that is currently processing' 
          }, { status: 400 });
        }

        // Delete the queue item
        await queueRef.delete();

        console.log(`Deleted queue item: ${queueId}`);

        return NextResponse.json({
          success: true,
          message: 'Queue item deleted successfully'
        });

      } catch (error: unknown) {
        console.error('Error deleting queue item:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'delete-scan' },
          extra: { userId: session?.user?.id }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
          error: 'Failed to delete queue item', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 