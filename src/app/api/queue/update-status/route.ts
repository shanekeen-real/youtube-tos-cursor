import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ScanQueueItem } from '@/types/queue';
import { Timestamp } from 'firebase-admin/firestore';
import * as Sentry from "@sentry/nextjs";

export async function PUT(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "PUT /api/queue/update-status",
    },
    async () => {
      let session = null;
      try {
        session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { queueId, status, progress, currentStep, currentStepIndex, error, scanId } = await req.json();

        if (!queueId) {
          return NextResponse.json({ error: 'Queue ID is required' }, { status: 400 });
        }

        // Get the queue item and verify ownership
        const queueRef = adminDb.collection('scan_queue').doc(queueId);
        const queueDoc = await queueRef.get();

        if (!queueDoc.exists) {
          return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
        }

        const queueData = queueDoc.data() as ScanQueueItem;
        if (queueData.userId !== userId) {
          return NextResponse.json({ error: 'Unauthorized access to queue item' }, { status: 403 });
        }

        // Prepare update data
        const updateData: Partial<ScanQueueItem> = {};

        if (status) {
          updateData.status = status;
          
                           // Set timestamps based on status
                 if (status === 'processing' && !queueData.startedAt) {
                   updateData.startedAt = Timestamp.now();
                 } else if (status === 'completed' || status === 'failed') {
                   updateData.completedAt = Timestamp.now();
                 }
        }

        if (progress !== undefined) {
          updateData.progress = Math.max(0, Math.min(100, progress));
        }

        if (currentStep) {
          updateData.currentStep = currentStep;
        }

        if (currentStepIndex !== undefined) {
          updateData.currentStepIndex = Math.max(0, Math.min(queueData.totalSteps - 1, currentStepIndex));
        }

        if (error !== undefined) {
          updateData.error = error;
        }

        if (scanId) {
          updateData.scanId = scanId;
        }

        // Update the queue item
        await queueRef.update(updateData);

        console.log(`Updated queue item ${queueId}: ${status || 'progress'} - ${progress || 0}%`);

        return NextResponse.json({
          success: true,
          queueId,
          message: 'Queue item updated successfully'
        });

      } catch (error: unknown) {
        console.error('Error updating queue status:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'update-status' },
          extra: { userId: session?.user?.id }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
          error: 'Failed to update queue status', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 