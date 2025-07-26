import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/queue/notify-completion",
    },
    async () => {
      try {
        const { userId, queueId, scanId, videoTitle, videoId } = await req.json();

        if (!userId || !queueId || !scanId) {
          return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Store the completion notification in a separate collection
        // This will be used by the frontend to show notifications
        await adminDb.collection('scan_notifications').add({
          userId,
          queueId,
          scanId,
          videoTitle: videoTitle || 'Untitled Video',
          videoId,
          status: 'completed',
          createdAt: Timestamp.now(),
          read: false
        });

        console.log(`Notification stored for user ${userId} - scan ${scanId} completed`);

        return NextResponse.json({
          success: true,
          message: 'Notification stored successfully'
        });

      } catch (error: unknown) {
        console.error('Error storing notification:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'notify-completion' }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
          error: 'Failed to store notification', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 