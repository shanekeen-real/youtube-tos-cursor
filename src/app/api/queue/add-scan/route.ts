import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ScanQueueItem } from '@/types/queue';
import { checkUserCanScan } from '@/lib/subscription-utils';
import { extractVideoId, isValidYouTubeUrl } from '@/lib/constants/url-patterns';
import { Timestamp } from 'firebase-admin/firestore';
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/queue/add-scan",
    },
    async () => {
      let session = null;
      try {
        session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url, videoTitle, videoThumbnail, priority = 'normal', isOwnVideo = false, scanOptions } = await req.json();

        if (!url || !isValidYouTubeUrl(url)) {
          return NextResponse.json({ error: 'A valid YouTube URL is required' }, { status: 400 });
        }

        // Check user's scan limit
        try {
          const userRef = adminDb.collection('users').doc(userId);
          const userDoc = await userRef.get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData) {
              const canScan = checkUserCanScan(userData);
              
              if (!canScan.canScan) {
                return NextResponse.json({ 
                  error: canScan.reason || 'You have reached your scan limit. Please upgrade for unlimited scans.' 
                }, { status: 429 });
              }
            }
          }
        } catch (limitError) {
          console.error('Error checking scan limit:', limitError);
          return NextResponse.json({ error: 'Failed to check scan limits' }, { status: 500 });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
          return NextResponse.json({ error: 'Could not extract video ID from URL' }, { status: 400 });
        }

        // Check if scan is already in queue (only prevent duplicate pending/processing scans)
        const existingScan = await adminDb.collection('scan_queue')
          .where('userId', '==', userId)
          .where('videoId', '==', videoId)
          .where('status', 'in', ['pending', 'processing'])
          .limit(1)
          .get();

        if (!existingScan.empty) {
          const existingItem = existingScan.docs[0].data();
          return NextResponse.json({ 
            error: 'This video is already in your scan queue',
            existingQueueId: existingScan.docs[0].id,
            existingStatus: existingItem.status,
            existingProgress: existingItem.progress
          }, { status: 409 });
        }

        // Note: Removed 24-hour restriction - users can now re-scan the same video at any time
        // This gives users full control over when they want to re-analyze content

        // Create queue item
        const queueItem: Omit<ScanQueueItem, 'id'> = {
          userId,
          videoId,
          videoTitle: videoTitle || 'Untitled Video',
          videoThumbnail: videoThumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          originalUrl: url,
          status: 'pending',
          progress: 0,
          currentStep: 'Queued',
          totalSteps: 5, // Video Preparation, Content Extraction, AI Analysis, Risk & Policy Analysis, Results & Suggestions
          currentStepIndex: 0,
          priority,
          isOwnVideo,
          scanOptions: scanOptions || {
            includeTranscript: true,
            includeAI: true,
            includeMultiModal: true
          },
                           createdAt: Timestamp.now()
        };

        // Add to queue
        const queueRef = await adminDb.collection('scan_queue').add(queueItem);
        
        console.log(`Added scan to queue: ${queueRef.id} for video ${videoId}`);

        // Trigger background processing of the queue
        try {
          // Use a non-blocking approach to trigger queue processing
          fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/queue/process-background?maxScans=3`, {
            method: 'GET'
          }).catch(error => {
            console.warn('Background queue processing trigger failed:', error);
            // This is not critical - the queue will still be processed when user visits queue page
          });
        } catch (backgroundError) {
          console.warn('Failed to trigger background processing:', backgroundError);
          // This is not critical - the queue will still be processed when user visits queue page
        }

        return NextResponse.json({
          success: true,
          queueId: queueRef.id,
          videoId,
          status: 'pending',
          message: 'Scan added to queue successfully'
        });

      } catch (error: unknown) {
        console.error('Error adding scan to queue:', error);
        Sentry.captureException(error, {
          tags: { component: 'queue', action: 'add-scan' },
          extra: { userId: session?.user?.id }
        });

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
          error: 'Failed to add scan to queue', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 